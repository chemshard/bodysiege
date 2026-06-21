(function () {
  "use strict";

  const TICK_MS = 2200;

  const organDefs = [
    { id: "colon", name: "Primary colon", system: "primary tissue", x: 0.5, y: 0.82, r: 0.052, weight: 1.1, niche: 1.08, oxygen: 0.76, immune: 0.52, difficulty: 0.2, seeded: true, burden: 3 },
    { id: "lymph", name: "Lymph nodes", system: "lymphatic", x: 0.38, y: 0.44, r: 0.04, weight: 0.72, niche: 0.88, oxygen: 0.72, immune: 0.86, difficulty: 0.42, seeded: false, burden: 0 },
    { id: "blood", name: "Bloodstream", system: "transport", x: 0.62, y: 0.44, r: 0.035, weight: 0.52, niche: 0.58, oxygen: 1, immune: 0.95, difficulty: 0.62, seeded: false, burden: 0 },
    { id: "lung", name: "Lung", system: "oxygen exchange", x: 0.5, y: 0.31, r: 0.056, weight: 1.1, niche: 0.96, oxygen: 1, immune: 0.74, difficulty: 0.48, seeded: false, burden: 0 },
    { id: "liver", name: "Liver", system: "metabolism", x: 0.38, y: 0.56, r: 0.055, weight: 1.15, niche: 1.05, oxygen: 0.84, immune: 0.7, difficulty: 0.38, seeded: false, burden: 0 },
    { id: "bone", name: "Bone marrow", system: "matrix niche", x: 0.59, y: 0.58, r: 0.045, weight: 0.95, niche: 0.84, oxygen: 0.62, immune: 0.68, difficulty: 0.56, seeded: false, burden: 0 },
    { id: "kidney", name: "Kidney", system: "filtration", x: 0.62, y: 0.76, r: 0.042, weight: 0.82, niche: 0.78, oxygen: 0.86, immune: 0.72, difficulty: 0.54, seeded: false, burden: 0 },
    { id: "brain", name: "Brain", system: "blood-brain barrier", x: 0.5, y: 0.13, r: 0.046, weight: 1, niche: 0.7, oxygen: 0.92, immune: 0.6, difficulty: 0.82, seeded: false, burden: 0 },
    { id: "peritoneum", name: "Peritoneum", system: "surface spread", x: 0.5, y: 0.65, r: 0.038, weight: 0.68, niche: 0.9, oxygen: 0.7, immune: 0.6, difficulty: 0.46, seeded: false, burden: 0 }
  ];

  const routes = [
    { from: "colon", to: "lymph", mode: "lymph", min: 9, label: "lymphatic drainage" },
    { from: "colon", to: "blood", mode: "blood", min: 16, label: "intravasation" },
    { from: "colon", to: "peritoneum", mode: "direct", min: 22, label: "local invasion" },
    { from: "lymph", to: "lung", mode: "lymph", min: 12, label: "thoracic duct" },
    { from: "blood", to: "lung", mode: "blood", min: 5, label: "first capillary bed" },
    { from: "blood", to: "liver", mode: "blood", min: 7, label: "portal filtering" },
    { from: "blood", to: "kidney", mode: "blood", min: 12, label: "renal filtration" },
    { from: "blood", to: "bone", mode: "blood", min: 14, label: "marrow niche" },
    { from: "lung", to: "brain", mode: "barrier", min: 20, label: "blood-brain barrier" },
    { from: "liver", to: "peritoneum", mode: "direct", min: 18, label: "surface shedding" }
  ];

  const meterDefs = [
    ["oxygen", "Oxygen transport", "#72adff"],
    ["glucose", "Glucose supply", "#efbd55"],
    ["lactate", "Lactate / acid", "#ff4f74"],
    ["immune", "Immune pressure", "#f4f7f2"],
    ["therapy", "Clinical response", "#aa8bff"],
    ["chaos", "Genomic chaos", "#ff8d6e"]
  ];

  const categoryLabels = {
    growth: "Growth",
    metabolism: "Metabolism",
    immune: "Immune",
    spread: "Spread"
  };

  const upgrades = [
    {
      id: "ras",
      category: "growth",
      title: "RAS activation",
      cost: 5,
      body: "Growth signaling stays on. Primary and metastatic lesions divide faster, but glucose demand rises.",
      tags: ["MAPK", "+growth", "+demand"],
      apply(s) {
        s.traits.growth += 0.34;
        s.traits.nutrientDemand += 0.18;
        s.detection += 2;
        teach("RAS turns growth-factor chemistry into a stuck accelerator.");
      }
    },
    {
      id: "apc",
      category: "growth",
      title: "APC loss",
      cost: 6,
      body: "Wnt signaling ignores tissue position. The primary tumour expands more easily under contact inhibition.",
      tags: ["Wnt", "+local expansion"],
      apply(s) {
        s.traits.contactEscape += 0.46;
        s.traits.growth += 0.12;
        teach("APC loss lets beta-catenin-driven proliferation ignore tissue architecture.");
      }
    },
    {
      id: "p53",
      category: "growth",
      title: "p53 loss",
      cost: 7,
      body: "DNA damage checkpoints weaken. Evolution accelerates, but genomic chaos becomes dangerous.",
      tags: ["checkpoint", "+mutation", "+chaos"],
      apply(s) {
        s.traits.apoptosisEscape += 0.36;
        s.traits.genomeInstability += 0.38;
        s.traits.mutationRate += 0.26;
        teach("p53 couples chemical damage to cell-cycle arrest and apoptosis.");
      }
    },
    {
      id: "telomerase",
      category: "growth",
      title: "Telomerase activation",
      cost: 7,
      body: "Telomeres are maintained. Long runs become possible, but mutation opportunities accumulate.",
      tags: ["telomeres", "immortality"],
      apply(s) {
        s.traits.telomerase += 1;
        s.traits.senescenceEscape += 0.72;
        teach("Telomerase extends chromosome ends, letting clonal lineages keep dividing.");
      }
    },
    {
      id: "myc",
      category: "growth",
      title: "MYC amplification",
      cost: 8,
      body: "Ribosome and nucleotide production surge. Biomass grows quickly when carbon and nitrogen are available.",
      tags: ["biosynthesis", "+burden"],
      apply(s) {
        s.traits.growth += 0.28;
        s.traits.nutrientDemand += 0.26;
        s.traits.biomass += 0.3;
        teach("MYC makes proliferation a chemistry supply-chain problem.");
      }
    },
    {
      id: "bcl2",
      category: "growth",
      title: "BCL-2 overexpression",
      cost: 6,
      body: "Mitochondrial apoptosis becomes harder to trigger. Stressed cells survive longer.",
      tags: ["mitochondria", "+survival"],
      apply(s) {
        s.traits.apoptosisEscape += 0.42;
        s.traits.stressTolerance += 0.12;
        teach("BCL-2 blocks mitochondrial membrane permeabilization, delaying apoptosis.");
      }
    },
    {
      id: "angiogenesis",
      category: "metabolism",
      title: "Angiogenesis",
      cost: 7,
      body: "VEGF recruits abnormal vessels. Oxygen and glucose improve, but immune cells and therapy can arrive too.",
      tags: ["VEGF", "+oxygen", "+detection"],
      apply(s) {
        s.traits.angiogenesis += 0.68;
        s.detection += 4;
        teach("Angiogenesis reduces diffusion limits, but vessels also bring immune traffic.");
      }
    },
    {
      id: "warburg",
      category: "metabolism",
      title: "Warburg metabolism",
      cost: 6,
      body: "Glycolysis stays high even with oxygen present. Low-oxygen growth improves, lactate rises.",
      tags: ["glycolysis", "+hypoxia", "+acid"],
      apply(s) {
        s.traits.warburg += 0.72;
        s.traits.oxygenFlex += 0.36;
        s.traits.lactateProduction += 0.32;
        teach("The Warburg effect trades ATP yield for fast glycolysis and biosynthetic intermediates.");
      }
    },
    {
      id: "hif",
      category: "metabolism",
      title: "HIF-1 stabilization",
      cost: 5,
      body: "Hypoxia-response genes increase GLUT1, glycolysis, and vessel signals.",
      tags: ["hypoxia", "GLUT1", "VEGF"],
      apply(s) {
        s.traits.oxygenFlex += 0.28;
        s.traits.angiogenesis += 0.2;
        s.traits.glucoseUptake += 0.18;
        teach("HIF-1 rewires gene expression when oxygen chemistry is low.");
      }
    },
    {
      id: "glutamine",
      category: "metabolism",
      title: "Glutamine addiction",
      cost: 6,
      body: "Glutamine feeds carbon and nitrogen into biomass. Growth improves under glucose stress.",
      tags: ["anaplerosis", "+biomass"],
      apply(s) {
        s.traits.starvationTolerance += 0.32;
        s.traits.biomass += 0.18;
        s.traits.chaosControl += 0.06;
        teach("Glutamine can refill the TCA cycle and supply nitrogen for nucleotides.");
      }
    },
    {
      id: "mct4",
      category: "metabolism",
      title: "Lactate export",
      cost: 5,
      body: "MCT transporters export lactate and protons. Acid stress becomes a weapon instead of only a cost.",
      tags: ["pH", "+acid shield"],
      apply(s) {
        s.traits.acidShield += 0.42;
        s.traits.lactateClearance += 0.22;
        teach("MCT transporters move lactate and protons, changing local pH and immune function.");
      }
    },
    {
      id: "nrf2",
      category: "metabolism",
      title: "NRF2 antioxidant program",
      cost: 6,
      body: "Detox chemistry rises. ROS damage and error catastrophe risk drop.",
      tags: ["redox", "-chaos"],
      apply(s) {
        s.traits.stressTolerance += 0.28;
        s.traits.chaosControl += 0.24;
        teach("NRF2 controls antioxidant genes, making redox chemistry part of survival.");
      }
    },
    {
      id: "pdl1",
      category: "immune",
      title: "PD-L1 expression",
      cost: 7,
      body: "T-cell attack is suppressed. Growth slows slightly because the immune shield is metabolically expensive.",
      tags: ["checkpoint", "+evasion", "-growth"],
      apply(s) {
        s.traits.immuneEvasion += 0.46;
        s.traits.growth -= 0.05;
        teach("PD-L1 binding PD-1 turns receptor chemistry into a T-cell brake.");
      }
    },
    {
      id: "mhc",
      category: "immune",
      title: "MHC downregulation",
      cost: 6,
      body: "CD8 T cells see fewer antigens, but NK cells become more suspicious.",
      tags: ["antigen display", "-CD8", "+NK risk"],
      apply(s) {
        s.traits.antigenStealth += 0.46;
        s.traits.nkRisk += 0.22;
        teach("Lower MHC dodges T cells but can trigger missing-self NK recognition.");
      }
    },
    {
      id: "tgfb",
      category: "immune",
      title: "TGF-beta niche",
      cost: 6,
      body: "Local immune activation falls and invasive behavior rises. Proliferation slows while the niche remodels.",
      tags: ["cytokines", "+evasion", "+invasion"],
      apply(s) {
        s.traits.immuneEvasion += 0.22;
        s.traits.motility += 0.16;
        s.traits.growth -= 0.04;
        teach("TGF-beta can suppress immunity and push epithelial cells toward invasion.");
      }
    },
    {
      id: "myeloid",
      category: "immune",
      title: "Myeloid recruitment",
      cost: 5,
      body: "Tumour-associated macrophages help remodel vessels and suppress immunity.",
      tags: ["macrophages", "+vessels", "+evasion"],
      apply(s) {
        s.traits.immuneEvasion += 0.2;
        s.traits.angiogenesis += 0.16;
        s.traits.matrixBreak += 0.08;
        teach("Macrophages can be co-opted into wound-healing-like tumour support.");
      }
    },
    {
      id: "antigen",
      category: "immune",
      title: "Antigen editing",
      cost: 5,
      body: "Highly visible neoantigens are selected away. Immune pressure falls, but evolution slows a bit.",
      tags: ["selection", "+stealth"],
      apply(s) {
        s.traits.antigenStealth += 0.28;
        s.traits.mutationRate -= 0.08;
        teach("Immune editing selects less visible peptide chemistry.");
      }
    },
    {
      id: "emt",
      category: "spread",
      title: "EMT program",
      cost: 7,
      body: "Adhesion drops and cells become motile. Spread improves, local proliferation slows.",
      tags: ["adhesion", "+motility"],
      apply(s) {
        s.traits.motility += 0.5;
        s.traits.growth -= 0.07;
        teach("EMT reduces epithelial adhesion and helps cells move through tissue.");
      }
    },
    {
      id: "protease",
      category: "spread",
      title: "Protease secretion",
      cost: 6,
      body: "Matrix proteins and basement membrane are degraded. Invasion improves, inflammation rises.",
      tags: ["ECM", "+invasion", "+immune"],
      apply(s) {
        s.traits.matrixBreak += 0.48;
        s.detection += 3;
        teach("Proteases digest extracellular matrix, creating invasion paths and danger signals.");
      }
    },
    {
      id: "intravasation",
      category: "spread",
      title: "Intravasation",
      cost: 8,
      body: "Tumour cells cross into blood vessels. Distant organs become reachable.",
      tags: ["vessels", "+blood spread"],
      apply(s) {
        s.traits.intravasation += 0.6;
        s.traits.circulationSurvival += 0.12;
        teach("Intravasation is the step where invasive cells enter vessels.");
      }
    },
    {
      id: "platelets",
      category: "spread",
      title: "Platelet cloak",
      cost: 6,
      body: "Circulating tumour cells hide from shear stress and immune attack.",
      tags: ["CTCs", "+survival"],
      apply(s) {
        s.traits.circulationSurvival += 0.52;
        s.traits.immuneEvasion += 0.12;
        teach("Platelets can shield circulating tumour cells from immune recognition and mechanical stress.");
      }
    },
    {
      id: "exosomes",
      category: "spread",
      title: "Pre-metastatic exosomes",
      cost: 7,
      body: "Vesicles condition distant tissues. Colonization bottlenecks get easier.",
      tags: ["vesicles", "+seeding"],
      apply(s) {
        s.traits.exosomes += 0.46;
        s.traits.colonization += 0.22;
        teach("Tumour exosomes can prepare distant niches before cells arrive.");
      }
    },
    {
      id: "lymphatic",
      category: "spread",
      title: "Lymphatic switch",
      cost: 5,
      body: "Cells exploit lymph drainage first. Lymph nodes become easier to seed.",
      tags: ["lymph", "+regional spread"],
      apply(s) {
        s.traits.lymphSpread += 0.58;
        teach("Many cancers spread through lymphatics before obvious blood-borne metastasis.");
      }
    },
    {
      id: "organotropism",
      category: "spread",
      title: "Organotropism",
      cost: 8,
      body: "Surface proteins match distant niches. Liver, bone, and brain seeding improve.",
      tags: ["niche", "+organ fit"],
      apply(s) {
        s.traits.liverTropism += 0.24;
        s.traits.boneTropism += 0.24;
        s.traits.brainTropism += 0.2;
        s.traits.colonization += 0.18;
        teach("Metastasis depends on seed-and-soil compatibility, not just travel.");
      }
    },
    {
      id: "cyclinE",
      category: "growth",
      title: "Cyclin E pulse",
      cost: 3,
      body: "A small cell-cycle push. Cheap growth now, but slightly more visible cycling cells.",
      tags: ["cheap", "+growth", "+detection"],
      apply(s) {
        s.traits.growth += 0.13;
        s.detection += 1.5;
        teach("Cyclins push cells through the cell cycle, but rapid cycling can leave detectable stress signals.");
      }
    },
    {
      id: "tertPromoter",
      category: "growth",
      title: "TERT promoter mutation",
      cost: 4,
      body: "A modest telomerase boost. Useful early, but weaker than full telomerase activation.",
      tags: ["cheap", "telomeres"],
      apply(s) {
        s.traits.telomerase += 0.35;
        s.traits.senescenceEscape += 0.24;
        teach("TERT promoter mutations can increase telomerase expression without a full immortalization leap.");
      }
    },
    {
      id: "wholeGenomeDoubling",
      category: "growth",
      title: "Whole-genome doubling",
      cost: 13,
      body: "A huge evolutionary buffer. Growth and adaptation jump, but genomic chaos surges.",
      tags: ["expensive", "+growth", "+chaos"],
      apply(s) {
        s.traits.growth += 0.42;
        s.traits.mutationRate += 0.28;
        s.traits.genomeInstability += 0.42;
        s.traits.chaosControl += 0.12;
        s.lethalLoad += 7;
        boostSeededOrgans(2.5);
        teach("Whole-genome doubling can buffer lethal mutations while also creating major instability.");
      }
    },
    {
      id: "oncogeneAmplification",
      category: "growth",
      title: "Oncogene amplification",
      cost: 11,
      body: "Multiple growth genes increase copy number. Very strong growth, very hungry metabolism.",
      tags: ["expensive", "+growth", "+demand"],
      apply(s) {
        s.traits.growth += 0.5;
        s.traits.biomass += 0.28;
        s.traits.nutrientDemand += 0.34;
        s.detection += 4;
        boostSeededOrgans(3.5);
        teach("Amplification increases gene dosage, which can create explosive but resource-hungry growth.");
      }
    },
    {
      id: "fattyAcid",
      category: "metabolism",
      title: "Fatty-acid synthesis",
      cost: 4,
      body: "Membrane production improves. A cheap biomass boost with a glucose cost.",
      tags: ["cheap", "lipids", "+biomass"],
      apply(s) {
        s.traits.biomass += 0.14;
        s.traits.nutrientDemand += 0.08;
        teach("Rapidly dividing cells need lipid chemistry to build new membranes.");
      }
    },
    {
      id: "macropinocytosis",
      category: "metabolism",
      title: "Macropinocytosis",
      cost: 5,
      body: "Cells scavenge extracellular proteins. Starvation hurts less, but immune debris increases detection.",
      tags: ["scavenging", "+starvation", "+detection"],
      apply(s) {
        s.traits.starvationTolerance += 0.28;
        s.traits.biomass += 0.12;
        s.detection += 2;
        teach("Macropinocytosis lets cells gulp extracellular material and recycle it into biomass.");
      }
    },
    {
      id: "mitochondrialFlex",
      category: "metabolism",
      title: "Mitochondrial flexibility",
      cost: 10,
      body: "Cells switch between oxidative phosphorylation and glycolysis. Strong systemic growth with less hypoxia penalty.",
      tags: ["expensive", "+ATP", "+hypoxia control"],
      apply(s) {
        s.traits.oxygenFlex += 0.38;
        s.traits.starvationTolerance += 0.26;
        s.traits.chaosControl += 0.14;
        boostSeededOrgans(1.5);
        teach("Metabolic plasticity lets clones survive across oxygen-rich and oxygen-poor organs.");
      }
    },
    {
      id: "ido",
      category: "immune",
      title: "IDO kynurenine pathway",
      cost: 4,
      body: "Tryptophan chemistry suppresses nearby T cells. Cheap immune evasion with a small growth cost.",
      tags: ["cheap", "metabolite", "+evasion"],
      apply(s) {
        s.traits.immuneEvasion += 0.16;
        s.traits.growth -= 0.02;
        teach("IDO depletes tryptophan and produces kynurenines that can suppress T-cell activity.");
      }
    },
    {
      id: "tregRecruitment",
      category: "immune",
      title: "Treg recruitment",
      cost: 10,
      body: "Regulatory T cells quiet immune attack across organs. Powerful, but it slows aggressive growth.",
      tags: ["expensive", "+immune shield", "-growth"],
      apply(s) {
        s.traits.immuneEvasion += 0.52;
        s.traits.antigenStealth += 0.18;
        s.traits.growth -= 0.07;
        teach("Regulatory immune cells can create a local tolerance niche around tumours.");
      }
    },
    {
      id: "hlaLoss",
      category: "immune",
      title: "HLA loss of heterozygosity",
      cost: 9,
      body: "Antigen presentation drops sharply. T-cell pressure falls, NK-cell suspicion rises.",
      tags: ["expensive", "-T cells", "+NK risk"],
      apply(s) {
        s.traits.antigenStealth += 0.56;
        s.traits.nkRisk += 0.28;
        teach("HLA loss can hide neoantigens from T cells, but missing-self surveillance becomes more relevant.");
      }
    },
    {
      id: "collectiveInvasion",
      category: "spread",
      title: "Collective invasion",
      cost: 4,
      body: "Cells move as clusters instead of alone. Regional spread improves, but blood spread is still limited.",
      tags: ["cheap", "+local spread"],
      apply(s) {
        s.traits.matrixBreak += 0.18;
        s.traits.motility += 0.1;
        teach("Cancer cells can invade as connected groups, preserving some survival signals while moving.");
      }
    },
    {
      id: "anoikisResistance",
      category: "spread",
      title: "Anoikis resistance",
      cost: 9,
      body: "Detached cells survive without matrix attachment. Circulating and peritoneal spread improve.",
      tags: ["expensive", "+CTC survival"],
      apply(s) {
        s.traits.circulationSurvival += 0.42;
        s.traits.colonization += 0.18;
        teach("Anoikis is apoptosis caused by loss of attachment; resisting it helps travelling cells survive.");
      }
    },
    {
      id: "brainHoming",
      category: "spread",
      title: "Brain homing program",
      cost: 12,
      body: "Adhesion and barrier-crossing traits improve brain seeding. Expensive but opens a hard organ.",
      tags: ["expensive", "+brain"],
      apply(s) {
        s.traits.brainTropism += 0.62;
        s.traits.circulationSurvival += 0.16;
        teach("Brain metastasis requires blood-brain barrier crossing and unusual niche compatibility.");
      }
    },
    {
      id: "pi3k",
      category: "growth",
      title: "PI3K/AKT survival",
      cost: 6,
      body: "Survival signaling buffers stress and apoptosis. Cells tolerate bad chemistry but consume more nutrients.",
      tags: ["AKT", "+survival", "+demand"],
      apply(s) {
        s.traits.apoptosisEscape += 0.24;
        s.traits.stressTolerance += 0.16;
        s.traits.nutrientDemand += 0.12;
        teach("PI3K/AKT signaling helps cells convert growth cues into survival and metabolism.");
      }
    },
    {
      id: "cdk4",
      category: "growth",
      title: "CDK4 amplification",
      cost: 5,
      body: "G1/S checkpoint pressure drops. Division improves, but cycling cells become easier to notice.",
      tags: ["cell cycle", "+growth", "+detection"],
      apply(s) {
        s.traits.growth += 0.18;
        s.traits.contactEscape += 0.14;
        s.detection += 2;
        teach("CDK4 pushes cells past restriction-point control in the cell cycle.");
      }
    },
    {
      id: "yapTaz",
      category: "growth",
      title: "YAP/TAZ mechanosensing",
      cost: 8,
      body: "Stiff tissue signals become growth cues. Crowding hurts less and invasion chemistry improves.",
      tags: ["mechanics", "+crowding", "+invasion"],
      apply(s) {
        s.traits.contactEscape += 0.3;
        s.traits.matrixBreak += 0.14;
        s.traits.growth += 0.08;
        teach("YAP/TAZ links tissue stiffness and mechanical tension to transcriptional growth programs.");
      }
    },
    {
      id: "serinePathway",
      category: "metabolism",
      title: "Serine synthesis",
      cost: 5,
      body: "One-carbon chemistry improves nucleotide supply. Biomass rises and genome stress is easier to buffer.",
      tags: ["one-carbon", "+DNA supply"],
      apply(s) {
        s.traits.biomass += 0.16;
        s.traits.chaosControl += 0.08;
        teach("Serine metabolism feeds one-carbon units needed for nucleotides and methylation chemistry.");
      }
    },
    {
      id: "autophagy",
      category: "metabolism",
      title: "Autophagy flux",
      cost: 7,
      body: "Cells recycle damaged parts during starvation. Growth is steadier when nutrients collapse.",
      tags: ["recycling", "+starvation"],
      apply(s) {
        s.traits.starvationTolerance += 0.3;
        s.traits.stressTolerance += 0.14;
        s.lethalLoad = clamp(s.lethalLoad - 3, 0, 100);
        teach("Autophagy recycles macromolecules and organelles, turning stress into reusable chemistry.");
      }
    },
    {
      id: "caix",
      category: "metabolism",
      title: "CAIX acid vent",
      cost: 7,
      body: "Carbonic anhydrase helps export acid under hypoxia. Acid stress falls, but abnormal pH attracts attention.",
      tags: ["pH", "+acid control", "+detection"],
      apply(s) {
        s.traits.acidShield += 0.24;
        s.traits.oxygenFlex += 0.14;
        s.detection += 2;
        teach("CAIX helps hypoxic cells manage carbon dioxide, bicarbonate, and extracellular acidity.");
      }
    },
    {
      id: "complementShield",
      category: "immune",
      title: "Complement shield",
      cost: 5,
      body: "Surface regulators reduce complement damage. Innate immune pressure is less efficient.",
      tags: ["innate", "+survival"],
      apply(s) {
        s.traits.immuneEvasion += 0.12;
        s.traits.stressTolerance += 0.12;
        teach("Complement regulators can stop membrane attack chemistry before it lyses cells.");
      }
    },
    {
      id: "cd47",
      category: "immune",
      title: "CD47 signal",
      cost: 8,
      body: "Macrophages receive a don't-eat-me cue. Phagocytosis drops, especially in inflamed organs.",
      tags: ["macrophage", "+evasion"],
      apply(s) {
        s.traits.immuneEvasion += 0.26;
        s.traits.antigenStealth += 0.08;
        teach("CD47 can bind SIRP-alpha on macrophages and suppress phagocytosis.");
      }
    },
    {
      id: "adenosineCloud",
      category: "immune",
      title: "Adenosine cloud",
      cost: 7,
      body: "Extracellular ATP is converted into immunosuppressive adenosine. T cells slow down, but growth pays a cost.",
      tags: ["metabolite", "+T-cell brake"],
      apply(s) {
        s.traits.immuneEvasion += 0.24;
        s.traits.growth -= 0.03;
        s.traits.lactateProduction += 0.04;
        teach("Adenosine signaling can dampen T-cell activity in metabolically stressed tumour niches.");
      }
    },
    {
      id: "integrinSwitch",
      category: "spread",
      title: "Integrin switch",
      cost: 6,
      body: "Adhesion receptors change which matrices feel like home. Invasion and new-organ fit improve.",
      tags: ["adhesion", "+niche fit"],
      apply(s) {
        s.traits.motility += 0.18;
        s.traits.colonization += 0.14;
        teach("Integrins read extracellular matrix chemistry and help cells choose where they can attach.");
      }
    },
    {
      id: "netRiding",
      category: "spread",
      title: "NET riding",
      cost: 8,
      body: "Inflammatory DNA-protein traps catch travelling cells. Circulation survival rises, but detection jumps.",
      tags: ["inflammation", "+CTC survival", "+detection"],
      apply(s) {
        s.traits.circulationSurvival += 0.28;
        s.traits.immuneEvasion += 0.08;
        s.detection += 4;
        teach("Neutrophil extracellular traps can physically trap tumour cells and help metastatic seeding.");
      }
    },
    {
      id: "perivascularNiche",
      category: "spread",
      title: "Perivascular niche",
      cost: 10,
      body: "Migrating cells hug vessel support signals. Colonization improves where blood vessels provide survival cues.",
      tags: ["vessels", "+colonization"],
      apply(s) {
        s.traits.colonization += 0.24;
        s.traits.angiogenesis += 0.1;
        s.traits.brainTropism += 0.08;
        teach("Perivascular niches provide adhesion, oxygen, and paracrine signals that can support metastases.");
      }
    },
    {
      id: "egfrPriming",
      category: "growth",
      title: "EGFR priming",
      cost: 3,
      body: "Surface receptors become more sensitive to growth factors. Division improves, but stress signals rise.",
      tags: ["receptor", "+growth", "+detection"],
      apply(s) {
        s.traits.growth += 0.12;
        s.detection += 1;
        teach("EGFR-like receptor signaling lets weak growth-factor chemistry produce stronger division signals.");
      }
    },
    {
      id: "rbLeak",
      category: "growth",
      title: "RB pathway leak",
      cost: 4,
      body: "Restriction-point control loosens. Cells divide more easily under imperfect growth conditions.",
      tags: ["checkpoint", "+cell cycle"],
      apply(s) {
        s.traits.contactEscape += 0.18;
        s.traits.growth += 0.06;
        teach("RB normally restrains entry into S phase; weakening it opens a different early growth route.");
      }
    },
    {
      id: "survivin",
      category: "growth",
      title: "Survivin expression",
      cost: 3,
      body: "Mitotic survival improves. Damaged dividing cells are less likely to self-destruct immediately.",
      tags: ["mitosis", "+survival"],
      apply(s) {
        s.traits.apoptosisEscape += 0.16;
        s.traits.stressTolerance += 0.06;
        teach("Survivin helps dividing cells resist death signals during mitosis.");
      }
    },
    {
      id: "mtorSense",
      category: "growth",
      title: "mTOR nutrient sense",
      cost: 4,
      body: "Nutrient-sensing growth programs turn on. Biomass rises, but hunger increases too.",
      tags: ["mTOR", "+biomass", "+demand"],
      apply(s) {
        s.traits.biomass += 0.12;
        s.traits.nutrientDemand += 0.1;
        teach("mTOR links amino acids and energy status to protein synthesis and biomass production.");
      }
    },
    {
      id: "repairTolerance",
      category: "growth",
      title: "Repair tolerance",
      cost: 4,
      body: "Cells tolerate imperfect DNA repair without immediate collapse. Evolution gets safer but still noisy.",
      tags: ["repair", "+stability"],
      apply(s) {
        s.traits.chaosControl += 0.12;
        s.traits.mutationRate += 0.04;
        teach("Early repair tolerance can preserve viability while still allowing variation to accumulate.");
      }
    },
    {
      id: "glut1",
      category: "metabolism",
      title: "GLUT1 upregulation",
      cost: 3,
      body: "Glucose import improves. Glycolysis has more fuel, especially in crowded tissue.",
      tags: ["transport", "+glucose"],
      apply(s) {
        s.traits.glucoseUptake += 0.22;
        s.traits.lactateProduction += 0.04;
        teach("GLUT1 increases glucose entry, making carbon uptake a selectable advantage.");
      }
    },
    {
      id: "pkm2",
      category: "metabolism",
      title: "PKM2 switch",
      cost: 4,
      body: "Glycolytic carbon is held for biosynthesis. Biomass improves and lactate starts rising.",
      tags: ["glycolysis", "+biomass"],
      apply(s) {
        s.traits.warburg += 0.14;
        s.traits.biomass += 0.08;
        s.traits.lactateProduction += 0.08;
        teach("PKM2 can slow the final glycolysis step, leaving upstream carbon for biosynthetic chemistry.");
      }
    },
    {
      id: "ironScavenging",
      category: "metabolism",
      title: "Iron scavenging",
      cost: 3,
      body: "Iron uptake supports DNA synthesis and respiration. Growth improves, but inflammation notices.",
      tags: ["iron", "+DNA supply", "+detection"],
      apply(s) {
        s.traits.biomass += 0.1;
        s.detection += 1;
        teach("Iron is needed for enzymes in DNA synthesis and mitochondrial chemistry.");
      }
    },
    {
      id: "nadphShunt",
      category: "metabolism",
      title: "NADPH shunt",
      cost: 4,
      body: "Pentose phosphate chemistry improves antioxidant power and nucleotide precursors.",
      tags: ["redox", "+stability"],
      apply(s) {
        s.traits.stressTolerance += 0.12;
        s.traits.chaosControl += 0.1;
        teach("NADPH supports reductive biosynthesis and antioxidant defenses.");
      }
    },
    {
      id: "lipidDroplets",
      category: "metabolism",
      title: "Lipid droplets",
      cost: 3,
      body: "Cells store fatty resources and buffer membrane stress. Starvation and acid stress hurt less.",
      tags: ["lipids", "+stress buffer"],
      apply(s) {
        s.traits.starvationTolerance += 0.12;
        s.traits.acidShield += 0.08;
        teach("Lipid droplets can store energy-rich molecules and protect cells under metabolic stress.");
      }
    },
    {
      id: "lowAntigenShedding",
      category: "immune",
      title: "Low antigen shedding",
      cost: 3,
      body: "Visible debris is reduced. Immune detection drops slightly, but evolution slows a touch.",
      tags: ["antigen", "+stealth"],
      apply(s) {
        s.traits.antigenStealth += 0.12;
        s.traits.mutationRate -= 0.02;
        teach("Reducing antigenic debris can make early immune recognition less efficient.");
      }
    },
    {
      id: "pge2",
      category: "immune",
      title: "PGE2 signal",
      cost: 4,
      body: "Inflammatory lipid signaling bends immunity toward tolerance and helps vessels remodel.",
      tags: ["lipid signal", "+evasion"],
      apply(s) {
        s.traits.immuneEvasion += 0.14;
        s.traits.angiogenesis += 0.04;
        teach("Prostaglandin E2 can suppress anti-tumour immunity while shaping inflammatory niches.");
      }
    },
    {
      id: "il10Whisper",
      category: "immune",
      title: "IL-10 whisper",
      cost: 3,
      body: "Local cytokines quiet immune activation. Growth pays a tiny signaling cost.",
      tags: ["cytokine", "+evasion"],
      apply(s) {
        s.traits.immuneEvasion += 0.12;
        s.traits.growth -= 0.01;
        teach("IL-10-like signaling can make immune cells less inflammatory around a tumour.");
      }
    },
    {
      id: "glycanMask",
      category: "immune",
      title: "Glycan mask",
      cost: 4,
      body: "Surface sugars hide peptide signals. T cells struggle more, but NK suspicion increases slightly.",
      tags: ["glycans", "+stealth", "+NK risk"],
      apply(s) {
        s.traits.antigenStealth += 0.16;
        s.traits.nkRisk += 0.04;
        teach("Altered glycosylation changes the molecular surface immune cells inspect.");
      }
    },
    {
      id: "stressLigandPruning",
      category: "immune",
      title: "Stress-ligand pruning",
      cost: 3,
      body: "Cells reduce distress flags that activate innate immune attack.",
      tags: ["innate", "+stealth"],
      apply(s) {
        s.traits.antigenStealth += 0.07;
        s.traits.immuneEvasion += 0.05;
        s.traits.nkRisk = Math.max(0, s.traits.nkRisk - 0.08);
        teach("Lower stress-ligand display can reduce NK-cell triggering in early lesions.");
      }
    },
    {
      id: "cadherinLoosening",
      category: "spread",
      title: "Cadherin loosening",
      cost: 3,
      body: "Cell-cell adhesion weakens. Edge cells move more easily, with a small proliferation cost.",
      tags: ["adhesion", "+motility"],
      apply(s) {
        s.traits.motility += 0.14;
        s.traits.growth -= 0.01;
        teach("Cadherins hold epithelial cells together; loosening them can start an invasion route.");
      }
    },
    {
      id: "hyaluronanCoat",
      category: "spread",
      title: "Hyaluronan coat",
      cost: 4,
      body: "A hydrated matrix coat supports movement and survival away from the primary site.",
      tags: ["matrix", "+survival"],
      apply(s) {
        s.traits.matrixBreak += 0.1;
        s.traits.circulationSurvival += 0.08;
        teach("Hyaluronan-rich matrix changes tissue mechanics and can support motile tumour cells.");
      }
    },
    {
      id: "invadopodia",
      category: "spread",
      title: "Invadopodia sparks",
      cost: 3,
      body: "Tiny invasive protrusions digest nearby matrix. Invasion begins, but danger signals rise.",
      tags: ["ECM", "+invasion", "+detection"],
      apply(s) {
        s.traits.matrixBreak += 0.14;
        s.detection += 1;
        teach("Invadopodia concentrate proteases at the cell edge to carve paths through matrix.");
      }
    },
    {
      id: "chemokineHoming",
      category: "spread",
      title: "Chemokine homing",
      cost: 4,
      body: "Cells read tissue chemokine gradients. Distant niche compatibility improves early.",
      tags: ["chemokine", "+niche fit"],
      apply(s) {
        s.traits.colonization += 0.12;
        s.traits.liverTropism += 0.06;
        teach("Chemokine receptors can guide tumour cells toward compatible tissue signals.");
      }
    },
    {
      id: "microtentacles",
      category: "spread",
      title: "Microtentacles",
      cost: 4,
      body: "Detached cells extend cytoskeletal hooks. Circulating survival and reattachment improve.",
      tags: ["CTCs", "+reattachment"],
      apply(s) {
        s.traits.circulationSurvival += 0.14;
        s.traits.colonization += 0.06;
        teach("Microtentacles can help circulating tumour cells lodge and reattach after travel.");
      }
    },
    {
      id: "e2fRelease",
      category: "growth",
      title: "E2F release",
      cost: 6,
      body: "Cell-cycle transcription ramps up after RB control loosens. Division improves, but cycling stress becomes more obvious.",
      tags: ["cell cycle", "+growth", "+detection"],
      apply(s) {
        s.traits.growth += 0.18;
        s.traits.contactEscape += 0.1;
        s.detection += 1.5;
        teach("E2F transcription factors turn checkpoint escape into S-phase gene expression.");
      }
    },
    {
      id: "apoptoticThresholdShift",
      category: "growth",
      title: "Apoptotic threshold shift",
      cost: 7,
      body: "Mitochondria tolerate more damage before committing to cell death. Stressed clones survive deeper bottlenecks.",
      tags: ["mitochondria", "+survival"],
      apply(s) {
        s.traits.apoptosisEscape += 0.24;
        s.traits.stressTolerance += 0.18;
        teach("Changing the balance of pro- and anti-apoptotic signals raises the death threshold.");
      }
    },
    {
      id: "damageBypass",
      category: "growth",
      title: "DNA damage bypass",
      cost: 8,
      body: "Cells continue dividing through damaged DNA. Evolution accelerates, but lethal passengers pile up.",
      tags: ["checkpoint", "+mutation", "+risk"],
      apply(s) {
        s.traits.mutationRate += 0.18;
        s.traits.genomeInstability += 0.16;
        s.traits.apoptosisEscape += 0.12;
        s.lethalLoad += 3;
        teach("Checkpoint loss can make damaged genomes heritable instead of terminal.");
      }
    },
    {
      id: "ecDnaRings",
      category: "growth",
      title: "ecDNA oncogene rings",
      cost: 12,
      body: "Circular extrachromosomal DNA carries extra oncogene copies. Growth surges, but heterogeneity and visibility rise.",
      tags: ["amplification", "+growth", "+chaos"],
      apply(s) {
        s.traits.growth += 0.34;
        s.traits.biomass += 0.2;
        s.traits.genomeInstability += 0.16;
        s.detection += 3;
        boostSeededOrgans(2);
        teach("ecDNA can amplify oncogenes unevenly, creating fast but unstable subclones.");
      }
    },
    {
      id: "chromothripsis",
      category: "growth",
      title: "Chromothripsis",
      cost: 13,
      body: "A chromosome shatters and is stitched back together. Adaptation can jump, but error catastrophe looms.",
      tags: ["catastrophe", "+evolution", "+risk"],
      apply(s) {
        s.traits.mutationRate += 0.22;
        s.traits.genomeInstability += 0.3;
        s.traits.chaosControl += 0.08;
        s.lethalLoad += 6;
        boostSeededOrgans(3);
        teach("Chromothripsis can create many rearrangements at once, useful only if essential genes survive.");
      }
    },
    {
      id: "ldhaInduction",
      category: "metabolism",
      title: "LDHA induction",
      cost: 6,
      body: "Pyruvate is pushed toward lactate. Hypoxic survival improves, while acid pressure rises.",
      tags: ["lactate", "+hypoxia", "+acid"],
      apply(s) {
        s.traits.warburg += 0.18;
        s.traits.oxygenFlex += 0.12;
        s.traits.lactateProduction += 0.16;
        teach("LDHA regenerates NAD+ for glycolysis by converting pyruvate into lactate.");
      }
    },
    {
      id: "vegfAmplification",
      category: "metabolism",
      title: "VEGF amplification",
      cost: 8,
      body: "Vessel signals intensify. Nutrient delivery improves, but immune and therapy access improve too.",
      tags: ["VEGF", "+vessels", "+detection"],
      apply(s) {
        s.traits.angiogenesis += 0.34;
        s.traits.glucoseUptake += 0.08;
        s.detection += 3;
        teach("More VEGF can feed a tumour, but new vessels are also biological roads inward.");
      }
    },
    {
      id: "ferroptosisShield",
      category: "metabolism",
      title: "Ferroptosis shield",
      cost: 7,
      body: "Lipid peroxide damage is buffered. Iron-rich, stressed clones survive longer.",
      tags: ["iron", "lipids", "+redox"],
      apply(s) {
        s.traits.stressTolerance += 0.22;
        s.traits.chaosControl += 0.1;
        s.traits.acidShield += 0.08;
        teach("Ferroptosis depends on iron and lipid peroxidation, so redox control becomes survival chemistry.");
      }
    },
    {
      id: "reductiveCarboxylation",
      category: "metabolism",
      title: "Reductive carboxylation",
      cost: 8,
      body: "Glutamine carbon is redirected into lipids under oxygen stress. Biomass improves in poor oxygen niches.",
      tags: ["glutamine", "+lipids", "+hypoxia"],
      apply(s) {
        s.traits.biomass += 0.2;
        s.traits.oxygenFlex += 0.16;
        s.traits.starvationTolerance += 0.12;
        teach("Reductive carboxylation lets glutamine support lipid synthesis when mitochondria are oxygen-limited.");
      }
    },
    {
      id: "lactateSymbiosis",
      category: "metabolism",
      title: "Lactate symbiosis",
      cost: 9,
      body: "Better-oxygenated cells recycle lactate from hypoxic neighbours. Acid becomes an ecosystem resource.",
      tags: ["ecosystem", "lactate", "+efficiency"],
      apply(s) {
        s.traits.lactateClearance += 0.22;
        s.traits.acidShield += 0.2;
        s.traits.immuneEvasion += 0.08;
        teach("Some tumour regions can use lactate exported by hypoxic cells, linking metabolism across the mass.");
      }
    },
    {
      id: "macrophagePolarization",
      category: "immune",
      title: "Macrophage polarization",
      cost: 7,
      body: "Recruited macrophages become wound-healing-like helpers. Immune pressure softens and matrix remodeling improves.",
      tags: ["TAM", "+evasion", "+matrix"],
      apply(s) {
        s.traits.immuneEvasion += 0.18;
        s.traits.matrixBreak += 0.1;
        s.traits.angiogenesis += 0.08;
        teach("Tumour-associated macrophages can be pushed toward repair programs that support growth.");
      }
    },
    {
      id: "exosomalPdl1",
      category: "immune",
      title: "Exosomal PD-L1",
      cost: 9,
      body: "Checkpoint signals travel on vesicles. T-cell suppression reaches beyond the immediate tumour edge.",
      tags: ["vesicles", "checkpoint", "+evasion"],
      apply(s) {
        s.traits.immuneEvasion += 0.28;
        s.traits.exosomes += 0.08;
        s.traits.growth -= 0.02;
        teach("PD-L1 carried on extracellular vesicles can suppress T cells at a distance.");
      }
    },
    {
      id: "lactateParalysis",
      category: "immune",
      title: "Lactate immune paralysis",
      cost: 8,
      body: "Acidic lactate-rich niches blunt immune cell metabolism. Evasion rises, but acid stress must be controlled.",
      tags: ["lactate", "+T-cell brake"],
      apply(s) {
        s.traits.immuneEvasion += 0.2;
        s.traits.acidShield += 0.08;
        s.traits.lactateProduction += 0.04;
        teach("High lactate and low pH can impair immune-cell metabolism inside tumours.");
      }
    },
    {
      id: "b2mLoss",
      category: "immune",
      title: "B2M loss",
      cost: 10,
      body: "Beta-2 microglobulin loss collapses MHC-I display. T cells lose targets, but NK cells become more dangerous.",
      tags: ["MHC-I", "-T cells", "+NK risk"],
      apply(s) {
        s.traits.antigenStealth += 0.38;
        s.traits.nkRisk += 0.22;
        teach("B2M is required for stable MHC-I display, so its loss hides peptides from CD8 T cells.");
      }
    },
    {
      id: "immuneDormancy",
      category: "immune",
      title: "Immune dormancy",
      cost: 11,
      body: "Clones slow down enough to persist under immune pressure. Growth falls, but survival under detection improves.",
      tags: ["dormancy", "+persistence", "-growth"],
      apply(s) {
        s.traits.immuneEvasion += 0.28;
        s.traits.stressTolerance += 0.16;
        s.traits.growth -= 0.06;
        teach("Dormant tumour cells can evade immune killing partly by reducing visible proliferation.");
      }
    },
    {
      id: "leaderCells",
      category: "spread",
      title: "Leader-cell invasion",
      cost: 7,
      body: "Specialized edge cells carve paths for followers. Collective invasion becomes more efficient.",
      tags: ["collective", "+invasion"],
      apply(s) {
        s.traits.motility += 0.18;
        s.traits.matrixBreak += 0.14;
        teach("Leader cells at invasive fronts can remodel matrix while other tumour cells follow.");
      }
    },
    {
      id: "basementBreach",
      category: "spread",
      title: "Basement membrane breach",
      cost: 8,
      body: "The epithelial boundary gives way. Local spread accelerates, but danger signals increase.",
      tags: ["basement membrane", "+invasion", "+detection"],
      apply(s) {
        s.traits.matrixBreak += 0.28;
        s.traits.motility += 0.08;
        s.detection += 2;
        teach("Breaching basement membrane is a key transition from in situ growth to invasive disease.");
      }
    },
    {
      id: "lymphNodeNiche",
      category: "spread",
      title: "Lymph-node niche",
      cost: 8,
      body: "Regional lymph nodes become supportive soil. Lymphatic spread and later distant seeding improve.",
      tags: ["lymph", "+niche"],
      apply(s) {
        s.traits.lymphSpread += 0.24;
        s.traits.colonization += 0.14;
        teach("Lymph nodes can act as stepping-stone niches before wider metastatic spread.");
      }
    },
    {
      id: "endothelialAdhesion",
      category: "spread",
      title: "Endothelial adhesion",
      cost: 9,
      body: "Travelling cells bind vessel walls more effectively. Arrest and exit from blood become easier.",
      tags: ["vessels", "+extravasation"],
      apply(s) {
        s.traits.circulationSurvival += 0.16;
        s.traits.colonization += 0.18;
        teach("Adhesion to endothelium helps circulating tumour cells stop before extravasation.");
      }
    },
    {
      id: "metastaticDormancy",
      category: "spread",
      title: "Metastatic dormancy",
      cost: 11,
      body: "Disseminated cells persist quietly until niches become permissive. Seeding improves, growth slows.",
      tags: ["dormancy", "+persistence"],
      apply(s) {
        s.traits.colonization += 0.26;
        s.traits.immuneEvasion += 0.08;
        s.traits.growth -= 0.04;
        teach("Many disseminated tumour cells survive as dormant seeds before forming visible metastases.");
      }
    }
  ];

  const upgradeWeb = {
    egfrPriming: { x: 8, y: 8, glyph: "EGF", requires: [] },
    ras: { x: 8, y: 20, glyph: "R", requires: [] },
    cyclinE: { x: 8, y: 32, glyph: "C", requires: [] },
    apc: { x: 8, y: 44, glyph: "A", requires: [] },
    rbLeak: { x: 8, y: 56, glyph: "RB", requires: [] },
    tertPromoter: { x: 8, y: 68, glyph: "T", requires: [] },
    survivin: { x: 8, y: 80, glyph: "Sur", requires: [] },
    repairTolerance: { x: 8, y: 92, glyph: "Fix", requires: [] },
    mtorSense: { x: 26, y: 12, glyph: "mT", requires: ["egfrPriming", "ras"] },
    cdk4: { x: 26, y: 44, glyph: "CDK", requires: ["cyclinE", "rbLeak"] },
    bcl2: { x: 26, y: 78, glyph: "B", requires: ["survivin"] },
    pi3k: { x: 44, y: 18, glyph: "AKT", requires: ["egfrPriming", "ras"] },
    telomerase: { x: 44, y: 66, glyph: "TL", requires: ["tertPromoter"] },
    e2fRelease: { x: 44, y: 44, glyph: "E2F", requires: ["cdk4", "rbLeak"] },
    apoptoticThresholdShift: { x: 46, y: 84, glyph: "AT", requires: ["bcl2", "survivin"] },
    p53: { x: 60, y: 42, glyph: "P", requires: ["apc", "repairTolerance"] },
    myc: { x: 62, y: 18, glyph: "M", requires: ["pi3k", "mtorSense"] },
    yapTaz: { x: 62, y: 64, glyph: "YAP", requires: ["apc", "cdk4"] },
    damageBypass: { x: 78, y: 50, glyph: "DB", requires: ["p53", "repairTolerance"] },
    oncogeneAmplification: { x: 82, y: 24, glyph: "++", requires: ["myc", "repairTolerance"] },
    wholeGenomeDoubling: { x: 84, y: 68, glyph: "2N", requires: ["p53", "telomerase"] },
    ecDnaRings: { x: 94, y: 34, glyph: "ec", requires: ["oncogeneAmplification", "myc"] },
    chromothripsis: { x: 94, y: 82, glyph: "Chr", requires: ["wholeGenomeDoubling", "damageBypass"] },

    glut1: { x: 8, y: 8, glyph: "GLU", requires: [] },
    pkm2: { x: 8, y: 20, glyph: "PK", requires: [] },
    hif: { x: 8, y: 34, glyph: "H", requires: [] },
    fattyAcid: { x: 8, y: 48, glyph: "F", requires: [] },
    ironScavenging: { x: 8, y: 62, glyph: "Fe", requires: [] },
    nadphShunt: { x: 8, y: 76, glyph: "NAD", requires: [] },
    lipidDroplets: { x: 28, y: 90, glyph: "Lip", requires: ["fattyAcid"] },
    warburg: { x: 30, y: 18, glyph: "W", requires: ["glut1", "pkm2"] },
    angiogenesis: { x: 30, y: 34, glyph: "V", requires: ["hif"] },
    serinePathway: { x: 30, y: 52, glyph: "1C", requires: ["glut1", "pkm2"] },
    nrf2: { x: 30, y: 76, glyph: "N", requires: ["nadphShunt"] },
    ldhaInduction: { x: 46, y: 8, glyph: "LDH", requires: ["warburg"] },
    glutamine: { x: 48, y: 52, glyph: "Q", requires: ["serinePathway", "ironScavenging"] },
    mct4: { x: 52, y: 18, glyph: "pH", requires: ["warburg"] },
    vegfAmplification: { x: 52, y: 36, glyph: "VEG", requires: ["angiogenesis", "hif"] },
    ferroptosisShield: { x: 54, y: 86, glyph: "Fer", requires: ["lipidDroplets", "nrf2"] },
    macropinocytosis: { x: 66, y: 52, glyph: "G", requires: ["glutamine"] },
    reductiveCarboxylation: { x: 70, y: 64, glyph: "RC", requires: ["glutamine", "nrf2"] },
    caix: { x: 70, y: 28, glyph: "C9", requires: ["hif", "mct4"] },
    autophagy: { x: 82, y: 72, glyph: "Au", requires: ["macropinocytosis", "nrf2"] },
    lactateSymbiosis: { x: 88, y: 24, glyph: "Lac", requires: ["ldhaInduction", "mct4", "caix"] },
    mitochondrialFlex: { x: 86, y: 50, glyph: "ATP", requires: ["glutamine", "nrf2", "warburg"] },

    lowAntigenShedding: { x: 8, y: 8, glyph: "Lo", requires: [] },
    antigen: { x: 8, y: 22, glyph: "Ag", requires: [] },
    ido: { x: 8, y: 36, glyph: "ID", requires: [] },
    pge2: { x: 8, y: 50, glyph: "PGE", requires: [] },
    il10Whisper: { x: 8, y: 64, glyph: "I10", requires: [] },
    glycanMask: { x: 8, y: 78, glyph: "Gly", requires: [] },
    stressLigandPruning: { x: 8, y: 92, glyph: "SL", requires: [] },
    mhc: { x: 30, y: 22, glyph: "MHC", requires: ["antigen", "lowAntigenShedding"] },
    myeloid: { x: 30, y: 50, glyph: "Mye", requires: ["pge2"] },
    complementShield: { x: 30, y: 80, glyph: "C'", requires: ["glycanMask", "stressLigandPruning"] },
    pdl1: { x: 52, y: 30, glyph: "PD", requires: ["antigen", "pge2"] },
    macrophagePolarization: { x: 50, y: 44, glyph: "M2", requires: ["myeloid", "pge2"] },
    tgfb: { x: 52, y: 54, glyph: "TB", requires: ["myeloid", "il10Whisper"] },
    adenosineCloud: { x: 54, y: 76, glyph: "Ado", requires: ["ido", "pge2"] },
    exosomalPdl1: { x: 70, y: 34, glyph: "xPD", requires: ["pdl1", "exosomes"] },
    lactateParalysis: { x: 72, y: 84, glyph: "Lac", requires: ["adenosineCloud", "mct4"] },
    hlaLoss: { x: 74, y: 22, glyph: "HLA", requires: ["mhc"] },
    cd47: { x: 76, y: 50, glyph: "47", requires: ["myeloid", "tgfb"] },
    tregRecruitment: { x: 82, y: 70, glyph: "Tr", requires: ["pdl1", "tgfb", "adenosineCloud"] },
    b2mLoss: { x: 88, y: 18, glyph: "B2M", requires: ["hlaLoss"] },
    immuneDormancy: { x: 94, y: 70, glyph: "Zzz", requires: ["tregRecruitment", "tgfb"] },

    cadherinLoosening: { x: 8, y: 10, glyph: "Cad", requires: [] },
    collectiveInvasion: { x: 8, y: 24, glyph: "CI", requires: [] },
    invadopodia: { x: 8, y: 38, glyph: "Inv", requires: [] },
    hyaluronanCoat: { x: 8, y: 54, glyph: "HA", requires: [] },
    chemokineHoming: { x: 8, y: 70, glyph: "Cx", requires: [] },
    protease: { x: 30, y: 34, glyph: "Pr", requires: ["invadopodia", "collectiveInvasion"] },
    emt: { x: 32, y: 14, glyph: "EMT", requires: ["cadherinLoosening"] },
    integrinSwitch: { x: 32, y: 58, glyph: "In", requires: ["hyaluronanCoat", "protease"] },
    lymphatic: { x: 34, y: 76, glyph: "Ly", requires: ["protease", "chemokineHoming"] },
    leaderCells: { x: 48, y: 18, glyph: "Led", requires: ["collectiveInvasion", "emt"] },
    basementBreach: { x: 48, y: 44, glyph: "BM", requires: ["protease", "invadopodia"] },
    intravasation: { x: 54, y: 30, glyph: "IV", requires: ["emt", "protease"] },
    exosomes: { x: 56, y: 76, glyph: "Ex", requires: ["lymphatic", "chemokineHoming"] },
    lymphNodeNiche: { x: 66, y: 88, glyph: "LN", requires: ["lymphatic", "exosomes"] },
    platelets: { x: 70, y: 28, glyph: "Pl", requires: ["intravasation"] },
    anoikisResistance: { x: 72, y: 48, glyph: "AR", requires: ["intravasation", "survivin"] },
    endothelialAdhesion: { x: 76, y: 8, glyph: "End", requires: ["intravasation", "integrinSwitch"] },
    microtentacles: { x: 82, y: 62, glyph: "Mic", requires: ["anoikisResistance"] },
    netRiding: { x: 84, y: 28, glyph: "NET", requires: ["intravasation", "protease"] },
    organotropism: { x: 78, y: 76, glyph: "Soil", requires: ["exosomes", "integrinSwitch", "chemokineHoming"] },
    perivascularNiche: { x: 88, y: 50, glyph: "PV", requires: ["organotropism", "angiogenesis"] },
    metastaticDormancy: { x: 94, y: 88, glyph: "Dor", requires: ["organotropism", "tgfb"] },
    brainHoming: { x: 94, y: 16, glyph: "BBB", requires: ["organotropism", "perivascularNiche"] }
  };

  upgrades.forEach((upgrade) => {
    Object.assign(upgrade, { x: 50, y: 50, glyph: upgrade.title.slice(0, 1), requires: [] }, upgradeWeb[upgrade.id] || {});
  });

  const stageLabels = {
    growth: [
      { x: 8, label: "Initiation" },
      { x: 30, label: "Cycle" },
      { x: 54, label: "Escape" },
      { x: 82, label: "Dominance" }
    ],
    metabolism: [
      { x: 8, label: "Inputs" },
      { x: 30, label: "Flux" },
      { x: 56, label: "Stress" },
      { x: 84, label: "Plasticity" }
    ],
    immune: [
      { x: 8, label: "Visibility" },
      { x: 30, label: "Innate" },
      { x: 56, label: "Suppression" },
      { x: 80, label: "Escape" }
    ],
    spread: [
      { x: 8, label: "Detach" },
      { x: 32, label: "Invade" },
      { x: 58, label: "Travel" },
      { x: 86, label: "Seed" }
    ]
  };

  const mutationEvents = [
    {
      id: "sprinter",
      title: "Sprinter subclone",
      body: "A fast-growing clone expands in the most crowded lesion.",
      tags: ["subclone", "+growth"],
      apply(s) {
        s.traits.growth += 0.12;
        s.traits.nutrientDemand += 0.05;
        spikeBestOrgan(3.5);
        teach("A faster clone only wins if chemistry can feed it.");
      }
    },
    {
      id: "glycolytic",
      title: "Glycolytic subclone",
      body: "A clone tolerates hypoxia better and exports more lactate.",
      tags: ["subclone", "+hypoxia"],
      apply(s) {
        s.traits.oxygenFlex += 0.16;
        s.traits.warburg += 0.16;
        s.traits.lactateProduction += 0.08;
        teach("Low-oxygen regions select for glycolytic variants.");
      }
    },
    {
      id: "immuneGhost",
      title: "Immune-ghost clone",
      body: "A less visible antigen profile appears under immune pressure.",
      tags: ["subclone", "+stealth"],
      apply(s) {
        s.traits.antigenStealth += 0.16;
        s.traits.growth -= 0.03;
        teach("Immune pressure can select slower but less visible clones.");
      }
    },
    {
      id: "wanderer",
      title: "Wanderer clone",
      body: "A motile edge clone trades division for invasion.",
      tags: ["subclone", "+spread"],
      apply(s) {
        s.traits.motility += 0.16;
        s.traits.growth -= 0.03;
        teach("Invasive clones often pay a proliferation cost.");
      }
    },
    {
      id: "repairCrash",
      title: "Repair crash",
      body: "DNA repair slips. Variation increases, but error catastrophe gets closer.",
      tags: ["mutation", "+chaos"],
      apply(s) {
        s.traits.mutationRate += 0.18;
        s.traits.genomeInstability += 0.18;
        s.lethalLoad += 4;
        teach("Genomic instability is useful until essential genes break.");
      }
    },
    {
      id: "vascularMimicry",
      title: "Vascular mimicry",
      body: "Tumour channels imitate vessel-like transport.",
      tags: ["transport", "+nutrients"],
      apply(s) {
        s.traits.angiogenesis += 0.18;
        s.traits.matrixBreak += 0.1;
        teach("Some tumours form vessel-like channels without normal endothelium.");
      }
    },
    {
      id: "aneuploidBranch",
      title: "Aneuploid branch",
      body: "A chromosome-imbalanced branch appears. Adaptability rises, but viability gets shaky.",
      tags: ["subclone", "+adaptation", "+risk"],
      apply(s) {
        s.traits.mutationRate += 0.12;
        s.traits.genomeInstability += 0.16;
        s.evolutionPoints += 1;
        s.lethalLoad += 2;
        teach("Aneuploidy changes gene dosage, sometimes helping a clone adapt and sometimes breaking core chemistry.");
      }
    },
    {
      id: "dormantSeed",
      title: "Dormant seed",
      body: "A quiet micrometastatic clone survives immune pressure and waits for a better niche.",
      tags: ["subclone", "+seeding"],
      apply(s) {
        s.traits.colonization += 0.12;
        s.traits.antigenStealth += 0.08;
        teach("Dormant disseminated cells can persist before becoming visible metastases.");
      }
    },
    {
      id: "liverFit",
      title: "Liver-fit clone",
      body: "A clone gains surface chemistry that survives portal filtering better.",
      tags: ["subclone", "+liver"],
      apply(s) {
        s.traits.liverTropism += 0.22;
        teach("Organ-specific adhesion and survival signals shape where metastases take hold.");
      }
    },
    {
      id: "boneFit",
      title: "Bone-niche clone",
      body: "A clone adapts to marrow growth factors and mineral-rich matrix.",
      tags: ["subclone", "+bone"],
      apply(s) {
        s.traits.boneTropism += 0.22;
        s.traits.matrixBreak += 0.06;
        teach("Bone metastases exploit matrix and growth-factor chemistry in the marrow niche.");
      }
    },
    {
      id: "therapyTolerant",
      title: "Drug-tolerant persister",
      body: "A slow-cycling clone survives therapy better but grows less explosively.",
      tags: ["subclone", "+therapy tolerance"],
      apply(s) {
        s.traits.stressTolerance += 0.24;
        s.traits.growth -= 0.04;
        teach("Persister cells can survive treatment without full genetic resistance.");
      }
    },
    {
      id: "neoantigenBurst",
      title: "Neoantigen burst",
      body: "A mutation burst creates new targets and new possibilities at the same time.",
      tags: ["subclone", "+points", "+detection"],
      apply(s) {
        s.evolutionPoints += 2;
        s.detection += 5;
        s.traits.mutationRate += 0.08;
        teach("More mutations can create useful variants, but also more immune-visible neoantigens.");
      }
    },
    {
      id: "stromalCooption",
      title: "Stromal co-option",
      body: "Nearby support cells help feed and protect the tumour.",
      tags: ["microenvironment", "+growth"],
      apply(s) {
        s.traits.angiogenesis += 0.1;
        s.traits.immuneEvasion += 0.08;
        s.traits.biomass += 0.08;
        teach("Tumours can co-opt normal stromal programs that resemble wound healing.");
      }
    }
  ];

  const els = {
    generation: byId("generation"),
    evoPoints: byId("evoPoints"),
    bodyColonized: byId("bodyColonized"),
    detection: byId("detection"),
    stateBadge: byId("stateBadge"),
    meters: byId("meters"),
    traitCount: byId("traitCount"),
    traitList: byId("traitList"),
    pauseButton: byId("pauseButton"),
    bodyCanvas: byId("bodyCanvas"),
    organBadge: byId("organBadge"),
    organGrid: byId("organGrid"),
    categoryTabs: byId("categoryTabs"),
    upgradeDeck: byId("upgradeDeck"),
    labBadge: byId("labBadge"),
    selectedName: byId("selectedName"),
    selectedBurden: byId("selectedBurden"),
    selectedDetails: byId("selectedDetails"),
    clearLog: byId("clearLog"),
    eventLog: byId("eventLog"),
    mutationModal: byId("mutationModal"),
    mutationStage: byId("mutationStage"),
    mutationTitle: byId("mutationTitle"),
    mutationText: byId("mutationText"),
    mutationChoices: byId("mutationChoices"),
    bubbleLayer: byId("bubbleLayer"),
    panelOverlay: byId("panelOverlay"),
    panelTitle: byId("panelTitle"),
    panelEyebrow: byId("panelEyebrow"),
    closePanel: byId("closePanel"),
    toast: byId("toast")
  };

  let state;
  let timer = null;
  let toastTimer = null;
  let tickerTimer = null;
  let routePulses = [];
  let floatingLabels = [];
  let canvasHover = null;
  let selectedRoute = null;
  let currentTicker = "";
  const logQueue = [];

  function byId(id) {
    return document.getElementById(id);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function chance(probability) {
    return Math.random() < probability;
  }

  function fmt(value) {
    return Math.round(value).toLocaleString();
  }

  function pct(value) {
    return `${Math.round(clamp(value, 0, 100))}%`;
  }

  function createState() {
    return {
      generation: 0,
      running: true,
      gameOver: false,
      victory: false,
      endReason: "",
      endGeneration: null,
      selectedOrgan: "colon",
      selectedCategory: "growth",
      selectedUpgrade: "cyclinE",
      evolutionPoints: 4,
      evolutionProgress: 0,
      detection: 0,
      treatment: 0,
      clinicallyDetected: false,
      clinicalResponseLogged: false,
      lethalLoad: 0,
      nextMutation: 10,
      pendingMutations: [],
      recentMutationEvents: [],
      bubbles: [],
      nextBubbleId: 1,
      bought: new Set(),
      log: [],
      resources: {
        oxygen: 90,
        glucose: 88,
        lactate: 4,
        immune: 8,
        therapy: 0,
        chaos: 0
      },
      traits: {
        growth: 1,
        biomass: 0,
        nutrientDemand: 1,
        contactEscape: 0,
        apoptosisEscape: 0,
        senescenceEscape: 0,
        telomerase: 0,
        mutationRate: 0.35,
        genomeInstability: 0,
        chaosControl: 0,
        angiogenesis: 0,
        warburg: 0,
        oxygenFlex: 0,
        glucoseUptake: 0,
        lactateProduction: 0,
        lactateClearance: 0,
        starvationTolerance: 0,
        acidShield: 0,
        stressTolerance: 0,
        immuneEvasion: 0,
        antigenStealth: 0,
        nkRisk: 0,
        motility: 0,
        matrixBreak: 0,
        intravasation: 0,
        circulationSurvival: 0,
        colonization: 0,
        lymphSpread: 0,
        exosomes: 0,
        liverTropism: 0,
        boneTropism: 0,
        brainTropism: 0
      },
      organs: organDefs.map((organ) => ({
        ...organ,
        burden: organ.burden || 0,
        seeded: Boolean(organ.seeded),
        nextEpMilestone: Math.max(10, Math.floor((organ.burden || 0) / 10) * 10 + 10),
        hypoxia: 0,
        immuneHeat: 0,
        lastDelta: 0
      }))
    };
  }

  function setup() {
    state = createState();
    els.meters.innerHTML = meterDefs.map(([key, label, color]) => {
      return `<div class="meter-row" data-meter="${key}">
        <div class="meter-top"><span>${label}</span><strong>0%</strong></div>
        <div class="meter-track"><div class="meter-fill" style="background:${color}"></div></div>
      </div>`;
    }).join("");
    els.categoryTabs.innerHTML = Object.entries(categoryLabels).map(([id, label]) => {
      return `<button class="tab-button" type="button" data-category="${id}">${label}</button>`;
    }).join("");

    els.pauseButton.addEventListener("click", togglePause);
    els.clearLog.addEventListener("click", () => {
      state.log = [];
      logQueue.length = 0;
      currentTicker = "";
      if (tickerTimer) window.clearTimeout(tickerTimer);
      tickerTimer = null;
      render();
    });
    document.querySelectorAll("[data-open-panel]").forEach((button) => {
      button.addEventListener("click", () => openPanel(button.dataset.openPanel));
    });
    els.closePanel.addEventListener("click", closePanel);
    els.panelOverlay.addEventListener("click", (event) => {
      if (event.target === els.panelOverlay) closePanel();
    });
    els.categoryTabs.addEventListener("click", (event) => {
      const button = event.target.closest("[data-category]");
      if (!button) return;
      state.selectedCategory = button.dataset.category;
      ensureSelectedUpgradeInCategory();
      render();
    });
    els.upgradeDeck.addEventListener("click", (event) => {
      const buyButton = event.target.closest("[data-buy-upgrade]");
      if (buyButton) {
        buyUpgrade(buyButton.dataset.buyUpgrade);
        return;
      }
      const jumpButton = event.target.closest("[data-jump-upgrade]");
      if (jumpButton) {
        const target = getUpgrade(jumpButton.dataset.jumpUpgrade);
        if (!target) return;
        state.selectedCategory = target.category;
        state.selectedUpgrade = target.id;
        render();
        return;
      }
      const button = event.target.closest("[data-upgrade]");
      if (!button) return;
      state.selectedUpgrade = button.dataset.upgrade;
      renderUpgrades();
    });
    els.organGrid.addEventListener("click", (event) => {
      const card = event.target.closest("[data-organ]");
      if (!card) return;
      state.selectedOrgan = card.dataset.organ;
      render();
    });
    els.mutationChoices.addEventListener("click", (event) => {
      const button = event.target.closest("[data-mutation]");
      if (!button) return;
      chooseMutation(button.dataset.mutation);
    });
    els.bubbleLayer.addEventListener("click", (event) => {
      const button = event.target.closest("[data-bubble]");
      if (!button) return;
      collectBubble(Number(button.dataset.bubble));
    });
    els.bodyCanvas.addEventListener("mousemove", handleCanvasMove);
    els.bodyCanvas.addEventListener("mouseleave", () => {
      canvasHover = null;
      renderCanvas();
    });
    els.bodyCanvas.addEventListener("click", handleCanvasClick);
    window.addEventListener("resize", () => renderCanvas());

    log("A small primary tumour starts in the colon. It can grow locally, but distant colonization needs invasion, vessels, and niche compatibility.");
    render();
    start();
    requestAnimationFrame(animate);
  }

  function start() {
    if (timer || state.gameOver || state.pendingMutations.length) return;
    state.running = true;
    els.pauseButton.innerHTML = '<span class="button-icon">||</span> Pause';
    timer = window.setInterval(tick, TICK_MS);
  }

  function stop() {
    if (timer) window.clearInterval(timer);
    timer = null;
    state.running = false;
    els.pauseButton.innerHTML = '<span class="button-icon">></span> Resume';
  }

  function togglePause() {
    if (state.gameOver || state.pendingMutations.length) return;
    if (timer) stop();
    else start();
    render();
  }

  function openPanel(name) {
    const labels = {
      hallmarks: ["Evolution", "Hallmark Hive"],
      organs: ["Colonization", "Organs"]
    };
    const [eyebrow, title] = labels[name] || labels.hallmarks;
    els.panelEyebrow.textContent = eyebrow;
    els.panelTitle.textContent = title;
    document.querySelectorAll("[data-panel-page]").forEach((page) => {
      page.classList.toggle("active", page.dataset.panelPage === name);
    });
    document.querySelectorAll("[data-open-panel]").forEach((button) => {
      button.classList.toggle("active", button.dataset.openPanel === name);
    });
    els.panelOverlay.classList.remove("hidden");
    els.panelOverlay.setAttribute("aria-hidden", "false");
  }

  function closePanel() {
    els.panelOverlay.classList.add("hidden");
    els.panelOverlay.setAttribute("aria-hidden", "true");
    document.querySelectorAll("[data-open-panel]").forEach((button) => {
      button.classList.remove("active");
    });
  }

  function tick() {
    if (state.gameOver || state.pendingMutations.length) return;
    state.generation += 1;
    updateResources();
    growOrgans();
    spreadBetweenOrgans();
    updateEvolutionPoints();
    updateDetectionAndTreatment();
    updateGenomicChaos();
    updateBubbles();
    maybeMutationEvent();
    checkEndStates();
    render();
  }

  function updateResources() {
    const burden = getBodyColonized();
    const vesselHelp = state.traits.angiogenesis * 12;
    const glucoseHelp = state.traits.glucoseUptake * 8;
    state.resources.oxygen = clamp(95 - burden * 0.78 * Math.max(0.35, 1 - state.traits.oxygenFlex * 0.32) + vesselHelp, 4, 100);
    state.resources.glucose = clamp(92 - burden * 0.62 * state.traits.nutrientDemand + glucoseHelp + vesselHelp * 0.4, 4, 100);
    state.resources.lactate = clamp(burden * (0.16 + state.traits.warburg * 0.28 + state.traits.lactateProduction * 0.22) - state.traits.lactateClearance * 16, 0, 100);
    state.resources.immune = clamp(state.detection * 0.72 + burden * 0.28 - state.traits.immuneEvasion * 16 - state.traits.antigenStealth * 14 + state.traits.nkRisk * 8, 0, 100);
    state.resources.therapy = state.treatment;
    state.resources.chaos = clamp(state.lethalLoad + state.traits.genomeInstability * 22 + state.traits.mutationRate * 9 - state.traits.chaosControl * 20, 0, 100);
  }

  function growOrgans() {
    state.organs.forEach((organ) => {
      if (!organ.seeded && organ.burden <= 0) {
        organ.lastDelta = 0;
        return;
      }
      const oxygenStress = clamp((48 - state.resources.oxygen * organ.oxygen) / 48, 0, 1);
      const glucoseStress = clamp((42 - state.resources.glucose) / 42, 0, 1);
      organ.hypoxia = clamp(organ.burden * 0.9 * oxygenStress + Math.max(0, organ.burden - 45) * 0.6 - state.traits.angiogenesis * 8, 0, 100);
      organ.immuneHeat = clamp(state.resources.immune * organ.immune + organ.burden * 0.12, 0, 100);

      const beforeBurden = organ.burden;
      const nutrientFactor = clamp(1 - glucoseStress * Math.max(0.18, 1 - state.traits.starvationTolerance) - oxygenStress * Math.max(0.16, 1 - state.traits.oxygenFlex - state.traits.warburg * 0.55), 0.24, 1.42);
      const hallmarkMultiplier = 1 + state.bought.size * 0.028 + state.traits.telomerase * 0.04 + state.traits.contactEscape * 0.06;
      const growth = (0.52 + state.traits.growth * 0.48 + state.traits.biomass * 0.22) * organ.niche * nutrientFactor * (1 + state.traits.angiogenesis * 0.12) * hallmarkMultiplier;
      const crowdBrake = clamp(1 - organ.burden / (135 + state.traits.contactEscape * 95 + state.traits.angiogenesis * 42 + state.traits.telomerase * 24), 0.11, 1);
      const immuneKill = organ.burden * organ.immuneHeat * 0.002 * Math.max(0.14, 1 - state.traits.immuneEvasion * 0.34 - state.traits.antigenStealth * 0.3);
      const therapyKill = organ.burden * state.treatment * 0.00105 * Math.max(0.22, 1 - state.traits.apoptosisEscape * 0.26 - state.traits.stressTolerance * 0.18);
      const acidCost = organ.burden * Math.max(0, state.resources.lactate - 62) * 0.00072 * Math.max(0.18, 1 - state.traits.acidShield);
      const delta = growth * crowdBrake - immuneKill - therapyKill - acidCost;
      organ.burden = clamp(organ.burden + delta, 0, 100);
      organ.seeded = organ.seeded || organ.burden > 0.4;
      organ.lastDelta = delta;
      checkOrganEpMilestones(organ, beforeBurden);
    });
  }

  function spreadBetweenOrgans() {
    routes.forEach((route) => {
      const from = getOrgan(route.from);
      const to = getOrgan(route.to);
      if (!from || !to || from.burden < route.min) return;
      const access = getRouteAccess(route);
      if (access <= 0) return;
      const tropism = getTropism(to);
      const bottleneck = to.difficulty * Math.max(0.22, 1 - state.traits.exosomes * 0.24 - state.traits.colonization * 0.28 - tropism * 0.2);
      const pressure = to.immune * state.resources.immune * 0.004;
      const spreadInvestment = state.traits.motility + state.traits.matrixBreak + state.traits.intravasation + state.traits.lymphSpread + state.traits.exosomes;
      const seedPower = (from.burden / 100) * access * (0.34 + state.traits.circulationSurvival * 0.24 + state.traits.colonization * 0.24 + tropism * 0.24 + spreadInvestment * 0.035);
      const chanceToSeed = clamp(seedPower - bottleneck * 0.05 - pressure * 0.02, 0, 0.36);

      if (!to.seeded && chance(chanceToSeed)) {
        const seed = 0.9 + seedPower * 5;
        const beforeBurden = to.burden;
        to.burden = clamp(to.burden + seed, 0, 100);
        to.seeded = true;
        addRoutePulse(route, to.id);
        checkOrganEpMilestones(to, beforeBurden);
        log(`${to.name} seeded through ${route.label}. Most travellers died, but one clone matched the niche.`);
      } else if (to.seeded && chance(clamp(chanceToSeed * 1.8, 0, 0.42))) {
        const beforeBurden = to.burden;
        to.burden = clamp(to.burden + 0.25 + seedPower * 1.5, 0, 100);
        addRoutePulse(route, to.id);
        checkOrganEpMilestones(to, beforeBurden);
      }
    });
  }

  function getRouteAccess(route) {
    if (route.mode === "lymph") return state.traits.lymphSpread + state.traits.matrixBreak * 0.25 + state.traits.motility * 0.18;
    if (route.mode === "blood") return state.traits.intravasation + state.traits.angiogenesis * 0.22 + state.traits.motility * 0.18;
    if (route.mode === "barrier") return state.traits.intravasation * 0.55 + state.traits.brainTropism + state.traits.circulationSurvival * 0.2;
    return state.traits.matrixBreak + state.traits.motility * 0.35;
  }

  function getTropism(organ) {
    if (organ.id === "liver") return state.traits.liverTropism;
    if (organ.id === "bone") return state.traits.boneTropism;
    if (organ.id === "brain") return state.traits.brainTropism;
    if (organ.id === "lymph") return state.traits.lymphSpread;
    return state.traits.colonization;
  }

  function updateEvolutionPoints() {
    const burden = getBodyColonized();
    const seeded = state.organs.filter((organ) => organ.seeded && organ.burden > 0.5).length;
    state.evolutionProgress += 0.16 + burden / 115 + seeded * 0.018 + state.traits.mutationRate * 0.04;
    while (state.evolutionProgress >= 1) {
      state.evolutionPoints += 1;
      state.evolutionProgress -= 1;
    }
  }

  function checkOrganEpMilestones(organ, beforeBurden) {
    if (!organ.seeded || organ.burden <= beforeBurden || state.gameOver || state.pendingMutations.length) return;
    while (organ.nextEpMilestone <= 100 && organ.burden >= organ.nextEpMilestone) {
      const milestone = organ.nextEpMilestone;
      const value = milestone % 50 === 0 ? 2 : 1;
      if (!spawnBubble("evo", organ, value, milestone)) break;
      organ.nextEpMilestone += 10;
    }
  }

  function updateBubbles() {
    state.bubbles.forEach((bubble) => {
      bubble.life -= 1;
    });
    state.bubbles = state.bubbles.filter((bubble) => bubble.life > 0);

    const maxBubbles = 5;
    if (state.bubbles.length >= maxBubbles || state.gameOver || state.pendingMutations.length) return;

    const stealthChance = clamp((state.detection - 28) / 260 + state.resources.immune / 900, 0, 0.14);
    if (state.detection > 28 && state.bubbles.length < maxBubbles && chance(stealthChance)) spawnBubble("stealth");
  }

  function spawnBubble(type, organOverride, valueOverride, milestone) {
    const maxBubbles = 6;
    if (state.bubbles.length >= maxBubbles) return false;
    const organ = organOverride || pickBubbleOrgan(type);
    const jitterX = (Math.random() - 0.5) * 0.12;
    const jitterY = (Math.random() - 0.5) * 0.1;
    state.bubbles.push({
      id: state.nextBubbleId,
      type,
      x: clamp(organ.x + jitterX, 0.12, 0.88),
      y: clamp(organ.y + jitterY, 0.12, 0.88),
      organName: organ.name,
      milestone,
      value: type === "evo" ? (valueOverride || 1) : Math.round(4 + Math.random() * 4),
      life: type === "evo" ? 10 : 5
    });
    state.nextBubbleId += 1;
    return true;
  }

  function pickBubbleOrgan(type) {
    const seeded = state.organs.filter((organ) => organ.seeded && organ.burden > 0.5);
    if (!seeded.length) return state.organs[0];
    if (type === "stealth") {
      return seeded.slice().sort((a, b) => b.immuneHeat + b.burden * 0.25 - (a.immuneHeat + a.burden * 0.25))[0];
    }
    return seeded[Math.floor(Math.random() * seeded.length)];
  }

  function collectBubble(id) {
    const bubble = state.bubbles.find((item) => item.id === id);
    if (!bubble || state.gameOver) return;
    if (bubble.type === "evo") {
      state.evolutionPoints += bubble.value;
      state.evolutionProgress = clamp(state.evolutionProgress + 0.15, 0, 0.95);
      toast(`+${bubble.value} evolution point${bubble.value > 1 ? "s" : ""}`);
    } else {
      const reduction = bubble.value;
      if (state.clinicallyDetected) {
        state.detection = 100;
        state.treatment = clamp(state.treatment - reduction, 0, 100);
      } else {
        state.detection = clamp(state.detection - reduction, 0, 100);
        state.treatment = clamp(state.treatment - reduction * 0.18, 0, 100);
      }
      state.lethalLoad = clamp(state.lethalLoad + 1.6, 0, 100);
      state.traits.antigenStealth += 0.012;
      toast(state.clinicallyDetected ? `Clinical response -${reduction}%` : `Detection -${reduction}%`);
      if (chance(0.22)) {
        log(state.clinicallyDetected
          ? "Stealth selection slowed clinical response, but the bottleneck added a little genomic risk."
          : "Stealth selection reduced detection, but the bottleneck added a little genomic risk.");
      }
    }
    state.bubbles = state.bubbles.filter((item) => item.id !== id);
    render();
  }

  function updateDetectionAndTreatment() {
    const burden = getBodyColonized();
    const seededOrgans = state.organs.filter((organ) => organ.seeded && organ.burden > 0.5).length;
    const visibleOrgans = state.organs.filter((organ) => organ.burden > 12).length;
    const bulkyOrgans = state.organs.filter((organ) => organ.burden > 35).length;
    const spreadNoise = (state.traits.intravasation + state.traits.matrixBreak + state.traits.motility + state.traits.angiogenesis) * 0.08;
    const symptomNoise = seededOrgans * 0.035 + visibleOrgans * 0.11 + bulkyOrgans * 0.18;
    const chemistryNoise = state.resources.lactate * 0.012 + Math.max(0, state.resources.chaos - 35) * 0.01;
    const stealth = state.traits.antigenStealth * 0.08 + state.traits.immuneEvasion * 0.06;
    const detectionPressure = burden * 0.035 + symptomNoise + chemistryNoise + spreadNoise - stealth;
    if (!state.clinicallyDetected) {
      state.detection = clamp(state.detection + detectionPressure, 0, 100);
      state.treatment = 0;
      if (state.detection >= 100) {
        state.clinicallyDetected = true;
        state.detection = 100;
        log("Detection reached 100%: the tumour is clinically visible and response pressure begins.");
      }
      return;
    }
    state.detection = 100;
    const responseGain = 1.2 + burden * 0.018 + visibleOrgans * 0.06 + bulkyOrgans * 0.12;
    state.treatment = clamp(state.treatment + responseGain, 0, 100);
    if (state.treatment >= 25 && !state.clinicalResponseLogged) {
      state.clinicalResponseLogged = true;
      log("Clinical response is escalating: therapy pressure now removes sensitive clones.");
    }
  }

  function updateGenomicChaos() {
    const chaosGain = state.traits.genomeInstability * 0.28 + state.traits.mutationRate * 0.12 + Math.max(0, state.resources.lactate - 60) * 0.008;
    const control = 0.16 + state.traits.chaosControl * 0.2 + state.traits.stressTolerance * 0.06;
    state.lethalLoad = clamp(state.lethalLoad + chaosGain - control, 0, 100);
    if (state.lethalLoad > 70 && chance(0.15)) {
      const organ = getLargestOrgan();
      organ.burden = clamp(organ.burden - 4 - state.lethalLoad * 0.05, 0, 100);
      log(`Error catastrophe hit ${organ.name}: instability broke essential genes faster than selection could rescue them.`);
    }
  }

  function maybeMutationEvent() {
    if (state.generation < state.nextMutation || state.pendingMutations.length || state.gameOver) return;
    const recent = new Set(state.recentMutationEvents);
    let pool = mutationEvents.filter((event) => !recent.has(event.id));
    if (pool.length < 4) pool = mutationEvents.slice();
    const choices = pool.slice().sort(() => Math.random() - 0.5).slice(0, 4);
    state.pendingMutations = choices;
    state.nextMutation += 14;
    stop();
    render();
    toast("Spontaneous clonal event");
  }

  function checkEndStates() {
    const burden = getBodyColonized();
    const total = state.organs.reduce((sum, organ) => sum + organ.burden, 0);
    if (burden >= 99.5) {
      state.gameOver = true;
      state.victory = true;
      state.endGeneration = state.generation;
      state.endReason = "body colonization reached 100%";
      stop();
      log(`Body-wide colonization achieved at generation ${state.generation}: ${state.endReason}.`);
      toast(`Run complete: generation ${state.generation}`);
      return;
    }
    if (state.treatment >= 100 || (total < 0.4 && state.generation > 18) || state.lethalLoad >= 100) {
      state.gameOver = true;
      state.victory = false;
      state.endGeneration = state.generation;
      state.endReason = state.treatment >= 100
        ? "clinical response reached 100%"
        : state.lethalLoad >= 100
          ? "genomic chaos reached lethal levels"
          : "total tumour burden fell below viability";
      stop();
      log(`Lineage collapse at generation ${state.generation}: ${state.endReason}.`);
      toast(`Run ended: generation ${state.generation}`);
    }
  }

  function buyUpgrade(id) {
    const upgrade = upgrades.find((item) => item.id === id);
    if (!upgrade || state.bought.has(id) || state.gameOver) return;
    if (!isUpgradeUnlocked(upgrade)) {
      toast(`Needs ${getRequirementText(upgrade)}`);
      return;
    }
    if (state.evolutionPoints < upgrade.cost) {
      toast(`${upgrade.cost - state.evolutionPoints} more evolution pts needed`);
      return;
    }
    state.evolutionPoints -= upgrade.cost;
    state.bought.add(id);
    upgrade.apply(state);
    log(`Evolved ${upgrade.title}.`);
    render();
  }

  function chooseMutation(id) {
    const mutation = state.pendingMutations.find((item) => item.id === id);
    if (!mutation) return;
    mutation.apply(state);
    log(`Clonal event: ${mutation.title}.`);
    state.recentMutationEvents.unshift(id);
    state.recentMutationEvents = state.recentMutationEvents.slice(0, 6);
    state.pendingMutations = [];
    render();
    start();
  }

  function spikeBestOrgan(amount) {
    const organ = getLargestOrgan();
    organ.burden = clamp(organ.burden + amount, 0, 100);
  }

  function boostSeededOrgans(amount) {
    state.organs.forEach((organ) => {
      if (!organ.seeded || organ.burden <= 0) return;
      organ.burden = clamp(organ.burden + amount * (0.55 + organ.niche * 0.45), 0, 100);
    });
  }

  function getUpgrade(id) {
    return upgrades.find((upgrade) => upgrade.id === id);
  }

  function isUpgradeUnlocked(upgrade) {
    return (upgrade.requires || []).every((id) => state.bought.has(id));
  }

  function getRequirementText(upgrade) {
    const missing = (upgrade.requires || [])
      .filter((id) => !state.bought.has(id))
      .map((id) => (getUpgrade(id) || { title: id }).title);
    return missing.length ? missing.join(" + ") : "prerequisites";
  }

  function getOrgan(id) {
    return state.organs.find((organ) => organ.id === id);
  }

  function getLargestOrgan() {
    return state.organs.reduce((best, organ) => (organ.burden > best.burden ? organ : best), state.organs[0]);
  }

  function getBodyColonized() {
    const totalWeight = state.organs.reduce((sum, organ) => sum + organ.weight, 0);
    return state.organs.reduce((sum, organ) => sum + organ.burden * organ.weight, 0) / totalWeight;
  }

  function addRoutePulse(route, targetId) {
    routePulses.push({ ...route, targetId, t: 0, life: 1 });
    routePulses = routePulses.slice(-36);
  }

  function teach(message) {
    log(message);
  }

  function log(message) {
    state.log.unshift(message);
    state.log = state.log.slice(0, 18);
    logQueue.push(message);
    if (!tickerTimer) showNextLog();
  }

  function showNextLog() {
    if (logQueue.length) {
      currentTicker = logQueue.shift();
      renderLog();
    }
    tickerTimer = window.setTimeout(() => {
      tickerTimer = null;
      if (logQueue.length) showNextLog();
    }, 5000);
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => els.toast.classList.remove("show"), 1800);
  }

  function render() {
    const burden = getBodyColonized();
    const seeded = state.organs.filter((organ) => organ.seeded && organ.burden > 0.5).length;
    els.generation.textContent = fmt(state.generation);
    els.evoPoints.textContent = fmt(state.evolutionPoints);
    els.bodyColonized.textContent = `${clamp(burden, 0, 100).toFixed(1)}%`;
    els.detection.textContent = pct(state.detection);
    els.stateBadge.textContent = state.gameOver ? (state.victory ? "Colonized" : "Collapsed") : state.clinicallyDetected ? "Diagnosed" : state.detection > 65 ? "Detected" : burden > 40 ? "Systemic" : "Silent";
    els.pauseButton.disabled = state.gameOver;
    if (state.gameOver) {
      els.pauseButton.innerHTML = state.victory
        ? '<span class="button-icon">100</span> Complete'
        : '<span class="button-icon">x</span> Collapsed';
    } else if (state.pendingMutations.length) {
      els.pauseButton.innerHTML = '<span class="button-icon">!</span> Choose';
    } else {
      els.pauseButton.innerHTML = state.running
        ? '<span class="button-icon">||</span> Pause'
        : '<span class="button-icon">></span> Resume';
    }
    els.organBadge.textContent = `${seeded} seeded`;
    els.labBadge.textContent = `${fmt(state.evolutionPoints)} pts`;
    els.traitCount.textContent = String(state.bought.size);
    renderMeters();
    renderTraits();
    renderTabs();
    renderUpgrades();
    renderOrgans();
    renderSelected();
    renderLog();
    renderMutationModal();
    renderBubbles();
    renderCanvas();
  }

  function renderMeters() {
    meterDefs.forEach(([key]) => {
      const row = els.meters.querySelector(`[data-meter="${key}"]`);
      const value = key === "therapy" ? state.treatment : state.resources[key];
      row.querySelector("strong").textContent = pct(value);
      row.querySelector(".meter-fill").style.width = `${clamp(value, 0, 100)}%`;
    });
  }

  function renderTraits() {
    const bought = upgrades.filter((upgrade) => state.bought.has(upgrade.id));
    els.traitList.innerHTML = bought.length
      ? bought.map((upgrade) => `<span class="trait-chip">${upgrade.title}</span>`).join("")
      : `<span class="trait-chip">normal checkpoints</span><span class="trait-chip">anchored epithelium</span>`;
  }

  function renderTabs() {
    els.categoryTabs.querySelectorAll(".tab-button").forEach((button) => {
      button.classList.toggle("active", button.dataset.category === state.selectedCategory);
    });
  }

  function renderUpgrades() {
    const cards = upgrades
      .filter((upgrade) => upgrade.category === state.selectedCategory)
      .slice()
      .sort((a, b) => a.x - b.x || a.y - b.y || a.cost - b.cost || a.title.localeCompare(b.title));
    if (!cards.some((upgrade) => upgrade.id === state.selectedUpgrade)) {
      state.selectedUpgrade = getDefaultUpgrade(cards).id;
    }
    const selected = getUpgrade(state.selectedUpgrade) || cards[0];
    const arrowId = `honeyArrow-${state.selectedCategory}`;
    const stageMarkers = (stageLabels[state.selectedCategory] || []).map((stage) => {
      return `<span class="stage-marker" style="left:${stage.x}%">${stage.label}</span>`;
    }).join("");
    const links = cards.flatMap((upgrade) => {
      return (upgrade.requires || []).map((id) => {
        const req = getUpgrade(id);
        if (!req || req.category !== upgrade.category) return "";
        const activeClass = state.bought.has(req.id) ? "active" : "locked";
        const highlightClass = upgrade.id === selected.id || req.id === selected.id ? "highlight" : "";
        return `<line class="honey-link ${activeClass} ${highlightClass}" x1="${Math.min(req.x + 5, 98)}" y1="${req.y}" x2="${Math.max(upgrade.x - 5, 2)}" y2="${upgrade.y}" marker-end="url(#${arrowId})"></line>`;
      });
    }).join("");
    const nodes = cards.map((upgrade) => {
      const stateClass = getUpgradeStateClass(upgrade);
      const status = getUpgradeStatus(upgrade);
      const selectedClass = upgrade.id === selected.id ? "selected" : "";
      return `<button class="honey-node ${stateClass} ${selectedClass}" type="button" data-upgrade="${upgrade.id}" aria-label="${upgrade.title}, ${status}" style="left:${upgrade.x}%; top:${upgrade.y}%">
        <span class="honey-glyph">${upgrade.glyph}</span>
        <span class="honey-title">${upgrade.title}</span>
        <span class="honey-cost">${state.bought.has(upgrade.id) ? "done" : `${upgrade.cost} EP`}</span>
      </button>`;
    }).join("");

    const selectedBought = state.bought.has(selected.id);
    const selectedUnlocked = isUpgradeUnlocked(selected);
    const selectedAffordable = state.evolutionPoints >= selected.cost;
    const actionDisabled = selectedBought || !selectedUnlocked || !selectedAffordable || state.gameOver;
    const actionText = selectedBought
      ? "Evolved"
      : !selectedUnlocked
        ? "Locked"
        : selectedAffordable
          ? "Evolve"
          : `${selected.cost - state.evolutionPoints} EP short`;
    const requirements = (selected.requires || []).length
      ? selected.requires.map((id) => {
        const req = getUpgrade(id);
        const done = state.bought.has(id);
        const prefix = req && req.category !== selected.category ? `${categoryLabels[req.category]}: ` : "";
        return `<button class="req-chip ${done ? "done" : ""}" type="button" data-jump-upgrade="${id}"><span class="req-direction">←</span>${prefix}${req ? req.title : id}</button>`;
      }).join("")
      : `<span class="req-chip done">No prerequisite</span>`;

    els.upgradeDeck.innerHTML = `<div class="honeycomb-window ${state.selectedCategory}">
      <div class="honeycomb-grid">
        <div class="stage-axis" aria-hidden="true">${stageMarkers}</div>
        <svg class="honey-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker id="${arrowId}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="4.8" markerHeight="4.8" orient="auto">
              <path d="M 0 0 L 8 4 L 0 8 z"></path>
            </marker>
          </defs>
          ${links}
        </svg>
        ${nodes}
      </div>
      <aside class="honey-info">
        <div class="honey-info-head">
          <span class="honey-glyph large">${selected.glyph}</span>
          <div>
            <p class="eyebrow">${categoryLabels[selected.category]}</p>
            <h3>${selected.title}</h3>
            <span class="info-status ${getUpgradeStateClass(selected)}">${getUpgradeStatus(selected)}</span>
          </div>
        </div>
        <p>${selected.body}</p>
        <div class="info-block">
          <strong>Requires</strong>
          <div class="req-list">${requirements}</div>
        </div>
        <div class="info-block">
          <strong>Biology tags</strong>
          <div class="tags">${selected.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
        </div>
        <button class="evolve-button" type="button" data-buy-upgrade="${selected.id}" ${actionDisabled ? "disabled" : ""}>${actionText} <span>${selected.cost} EP</span></button>
      </aside>
    </div>`;
  }

  function ensureSelectedUpgradeInCategory() {
    const cards = upgrades.filter((upgrade) => upgrade.category === state.selectedCategory);
    if (!cards.some((upgrade) => upgrade.id === state.selectedUpgrade)) {
      state.selectedUpgrade = getDefaultUpgrade(cards).id;
    }
  }

  function getDefaultUpgrade(cards) {
    return cards.find((upgrade) => !state.bought.has(upgrade.id) && isUpgradeUnlocked(upgrade) && state.evolutionPoints >= upgrade.cost)
      || cards.find((upgrade) => !state.bought.has(upgrade.id) && isUpgradeUnlocked(upgrade))
      || cards[0];
  }

  function getUpgradeStateClass(upgrade) {
    if (state.bought.has(upgrade.id)) return "bought";
    if (!isUpgradeUnlocked(upgrade)) return "locked";
    if (state.evolutionPoints >= upgrade.cost) return "ready";
    return "priced";
  }

  function getUpgradeStatus(upgrade) {
    if (state.bought.has(upgrade.id)) return "evolved";
    if (!isUpgradeUnlocked(upgrade)) return `needs ${getRequirementText(upgrade)}`;
    if (state.evolutionPoints >= upgrade.cost) return "available";
    return `${upgrade.cost - state.evolutionPoints} EP short`;
  }

  function renderOrgans() {
    els.organGrid.innerHTML = state.organs.map((organ) => {
      const active = organ.id === state.selectedOrgan ? " active" : "";
      const status = organ.seeded ? `${pct(organ.burden)} burden` : "unseeded";
      return `<button class="organ-card${active}" type="button" data-organ="${organ.id}">
        <h3>${organ.name}</h3>
        <p>${organ.system} / ${status}</p>
        <div class="burden-bar"><div class="burden-fill" style="width:${clamp(organ.burden, 0, 100)}%"></div></div>
      </button>`;
    }).join("");
  }

  function renderSelected() {
    const organ = getOrgan(state.selectedOrgan) || state.organs[0];
    els.selectedName.textContent = organ.name;
    els.selectedBurden.textContent = pct(organ.burden);
    els.selectedDetails.innerHTML = `
      <div><strong>System:</strong> ${organ.system}</div>
      <div><strong>Burden:</strong> ${pct(organ.burden)} ${organ.seeded ? "seeded" : "not seeded"}</div>
      <div><strong>Hypoxia:</strong> ${pct(organ.hypoxia)}</div>
      <div><strong>Local immune heat:</strong> ${pct(organ.immuneHeat)}</div>
      <div><strong>Growth trend:</strong> ${organ.lastDelta >= 0 ? "+" : ""}${organ.lastDelta.toFixed(2)} burden / generation</div>
    `;
  }

  function renderLog() {
    const message = currentTicker || state.log[0] || "No biology events yet.";
    els.eventLog.innerHTML = `<li>${message}</li>`;
  }

  function renderMutationModal() {
    const open = state.pendingMutations.length > 0;
    els.mutationModal.classList.toggle("hidden", !open);
    if (!open) {
      els.mutationChoices.innerHTML = "";
      return;
    }
    els.mutationStage.textContent = `Generation ${state.generation}`;
    els.mutationText.textContent = "A spontaneous subclone has emerged. Choose one event; the game is paused until you pick.";
    els.mutationChoices.innerHTML = state.pendingMutations.map((mutation) => {
      return `<button class="upgrade-card" type="button" data-mutation="${mutation.id}">
        <div class="upgrade-head"><h3>${mutation.title}</h3><span class="cost">free</span></div>
        <p>${mutation.body}</p>
        <div class="tags">${mutation.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
      </button>`;
    }).join("");
  }

  function renderBubbles() {
    els.bubbleLayer.innerHTML = state.bubbles.map((bubble) => {
      const label = bubble.type === "evo" && bubble.milestone
        ? `${bubble.organName} ${bubble.milestone}%`
        : bubble.type === "evo"
          ? `+${bubble.value} EP`
          : state.clinicallyDetected
            ? `-${bubble.value}% clinical response`
            : `-${bubble.value}% detection`;
      const symbol = bubble.type === "evo" ? "🧫" : "⚗️";
      return `<button class="map-bubble ${bubble.type}" type="button" data-bubble="${bubble.id}" aria-label="${label}" style="left:${bubble.x * 100}%; top:${bubble.y * 100}%">
        <span aria-hidden="true">${symbol}</span>
      </button>`;
    }).join("");
  }

  function fitCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function renderCanvas() {
    fitCanvas(els.bodyCanvas);
    const canvas = els.bodyCanvas;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const view = getBodyView(w, h);
    ctx.clearRect(0, 0, w, h);
    drawBackdrop(ctx, w, h);
    drawBody(ctx, view);
    drawRoutes(ctx, view);
    drawOrgans(ctx, view);
    drawPulses(ctx, view);
    drawFloatingLabels(ctx, view);
  }

  function getBodyView(w, h) {
    const targetRatio = 0.74;
    let width = w * 0.84;
    let height = width / targetRatio;
    if (height > h * 0.9) {
      height = h * 0.9;
      width = height * targetRatio;
    }
    return {
      x: (w - width) / 2,
      y: (h - height) / 2,
      w: width,
      h: height,
      min: Math.min(width, height)
    };
  }

  function drawBackdrop(ctx, w, h) {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#111820");
    gradient.addColorStop(0.5, "#0f1317");
    gradient.addColorStop(1, "#151012");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    const oxygen = ctx.createRadialGradient(w * 0.5, h * 0.18, 10, w * 0.5, h * 0.18, h * 0.55);
    oxygen.addColorStop(0, "rgba(114,173,255,0.22)");
    oxygen.addColorStop(1, "rgba(114,173,255,0)");
    ctx.fillStyle = oxygen;
    ctx.fillRect(0, 0, w, h);

    const acid = clamp(state.resources.lactate / 100, 0, 1);
    const acidGrad = ctx.createRadialGradient(w * 0.5, h * 0.72, 10, w * 0.5, h * 0.72, h * 0.45);
    acidGrad.addColorStop(0, `rgba(255,79,116,${0.06 + acid * 0.18})`);
    acidGrad.addColorStop(1, "rgba(255,79,116,0)");
    ctx.fillStyle = acidGrad;
    ctx.fillRect(0, 0, w, h);
  }

  function drawBody(ctx, view) {
    const { x, y, w, h } = view;
    ctx.save();
    ctx.strokeStyle = "rgba(244,247,242,0.28)";
    ctx.fillStyle = "rgba(244,247,242,0.045)";
    ctx.lineWidth = Math.max(1, w / 520);

    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.12, w * 0.095, h * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + w * 0.35, y + h * 0.21);
    ctx.bezierCurveTo(x + w * 0.22, y + h * 0.34, x + w * 0.24, y + h * 0.6, x + w * 0.32, y + h * 0.88);
    ctx.bezierCurveTo(x + w * 0.42, y + h * 0.96, x + w * 0.58, y + h * 0.96, x + w * 0.68, y + h * 0.88);
    ctx.bezierCurveTo(x + w * 0.76, y + h * 0.6, x + w * 0.78, y + h * 0.34, x + w * 0.65, y + h * 0.21);
    ctx.bezierCurveTo(x + w * 0.6, y + h * 0.18, x + w * 0.4, y + h * 0.18, x + w * 0.35, y + h * 0.21);
    ctx.fill();
    ctx.stroke();

    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = "rgba(255,79,116,0.65)";
    ctx.lineWidth = Math.max(4, w / 110);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.5, y + h * 0.21);
    ctx.bezierCurveTo(x + w * 0.52, y + h * 0.36, x + w * 0.56, y + h * 0.54, x + w * 0.5, y + h * 0.88);
    ctx.stroke();
    ctx.restore();
  }

  function drawRoutes(ctx, view) {
    const { w, h } = view;
    ctx.save();
    routes.forEach((route) => {
      const from = getOrgan(route.from);
      const to = getOrgan(route.to);
      const active = from && to && from.burden >= route.min && getRouteAccess(route) > 0.02;
      const a = toCanvas(from, view);
      const b = toCanvas(to, view);
      ctx.globalAlpha = active ? 0.56 : 0.16;
      ctx.strokeStyle = route.mode === "lymph" ? "#58ddc7" : route.mode === "barrier" ? "#aa8bff" : "#ff4f74";
      ctx.lineWidth = active ? Math.max(2, w / 420) : Math.max(1, w / 720);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      const cx = (a.x + b.x) / 2 + Math.sin(a.y + b.y) * w * 0.035;
      const cy = (a.y + b.y) / 2 - h * 0.035;
      ctx.quadraticCurveTo(cx, cy, b.x, b.y);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawOrgans(ctx, view) {
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    state.organs.forEach((organ) => {
      const pos = toCanvas(organ, view);
      const r = organ.r * view.min;
      const burden = clamp(organ.burden / 100, 0, 1);
      const selected = organ.id === state.selectedOrgan;
      ctx.globalAlpha = organ.seeded ? 0.94 : 0.42;
      ctx.fillStyle = organ.seeded ? mixColor("#20262b", "#ff4f74", Math.max(0.18, burden)) : "rgba(244,247,242,0.09)";
      ctx.strokeStyle = selected ? "#58ddc7" : organ.seeded ? "#ff9bad" : "rgba(244,247,242,0.22)";
      ctx.lineWidth = selected ? Math.max(3, dpr * 2) : Math.max(1, dpr);
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, r * 1.25, r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (organ.hypoxia > 25) {
        ctx.globalAlpha = clamp(organ.hypoxia / 140, 0.12, 0.42);
        ctx.strokeStyle = "#72adff";
        ctx.lineWidth = Math.max(2, dpr * 1.5);
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y, r * 1.55, r * 1.26, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (organ.seeded && burden > 0.02) {
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = "#ffe7ed";
        ctx.beginPath();
        ctx.arc(pos.x + r * 0.36, pos.y - r * 0.18, Math.max(2.5 * dpr, r * 0.18), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.fillStyle = selected ? "#f4f7f2" : "#b8c1bd";
      ctx.font = `${Math.max(10, 11 * dpr)}px "Eurostile UI", "Eurostile", "Bahnschrift SemiCondensed", "Bahnschrift Condensed", Bahnschrift, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(organ.name, pos.x, pos.y + r + 6 * dpr);
      if (organ.seeded) {
        ctx.fillStyle = "#ffb7c5";
        ctx.fillText(pct(organ.burden), pos.x, pos.y + r + 20 * dpr);
      }
    });
    ctx.restore();
  }

  function drawPulses(ctx, view) {
    const { w, h } = view;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    routePulses.forEach((pulse) => {
      const from = getOrgan(pulse.from);
      const to = getOrgan(pulse.to);
      if (!from || !to) return;
      pulse.t += 0.012;
      pulse.life -= 0.003;
      const a = toCanvas(from, view);
      const b = toCanvas(to, view);
      const midX = (a.x + b.x) / 2 + Math.sin(a.y + b.y) * w * 0.035;
      const midY = (a.y + b.y) / 2 - h * 0.035;
      const p = quadraticPoint(a.x, a.y, midX, midY, b.x, b.y, clamp(pulse.t, 0, 1));
      ctx.globalAlpha = clamp(pulse.life, 0, 1);
      ctx.shadowColor = "#ff4f74";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#ff4f74";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
    routePulses = routePulses.filter((pulse) => pulse.life > 0 && pulse.t < 1.08);
    ctx.restore();
  }

  function drawFloatingLabels(ctx, view) {
    if (canvasHover) {
      const organ = getOrgan(canvasHover);
      const pos = toCanvas(organ, view);
      drawLabel(ctx, `${organ.name}: ${organ.seeded ? pct(organ.burden) : "unseeded"}`, pos.x + 16, pos.y - 26, "#f4f7f2");
    }
    floatingLabels = floatingLabels.filter((label) => label.life > 0);

    if (selectedRoute) {
      const p = getRouteLabelPoint(selectedRoute, view);
      const from = getOrgan(selectedRoute.from);
      const to = getOrgan(selectedRoute.to);

      drawLabel(
         ctx,
         `${from.name} to ${to.name}: ${selectedRoute.label}`,
         p.x + 14,
         p.y - 18,
         "#ffd87b"
      );
    }
  }

  function handleCanvasMove(event) {
    const rect = els.bodyCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const x = (event.clientX - rect.left) * dpr;
    const y = (event.clientY - rect.top) * dpr;
    const w = els.bodyCanvas.width;
    const h = els.bodyCanvas.height;
    const view = getBodyView(w, h);
    let found = null;
    for (const organ of state.organs) {
      const pos = toCanvas(organ, view);
      const r = organ.r * view.min * 1.5;
      if (Math.hypot(x - pos.x, y - pos.y) < r) found = organ.id;
    }
    canvasHover = found;
    renderCanvas();
  }

  function handleCanvasClick(event) {
  const point = getCanvasPoint(event);
  const view = getBodyView(els.bodyCanvas.width, els.bodyCanvas.height);
  const route = getRouteAtPoint(point.x, point.y, view);

  if (route) {
    selectedRoute = route;
    renderCanvas();
    return;
  }

  selectedRoute = null;

  if (canvasHover) {
    state.selectedOrgan = canvasHover;
    render();
    return;
  }

  renderCanvas();
}

function getCanvasPoint(event) {
  const rect = els.bodyCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  return {
    x: (event.clientX - rect.left) * dpr,
    y: (event.clientY - rect.top) * dpr
  };
}

function getRouteAtPoint(x, y, view) {
  let closestRoute = null;
  let closestDistance = Infinity;
  const hitRadius = Math.max(12, view.w / 42);

  routes.forEach((route) => {
    const from = getOrgan(route.from);
    const to = getOrgan(route.to);
    if (!from || !to) return;

    const a = toCanvas(from, view);
    const b = toCanvas(to, view);
    const cx = (a.x + b.x) / 2 + Math.sin(a.y + b.y) * view.w * 0.035;
    const cy = (a.y + b.y) / 2 - view.h * 0.035;

    const distance = distanceToRoute(x, y, a.x, a.y, cx, cy, b.x, b.y);

    if (distance < hitRadius && distance < closestDistance) {
      closestRoute = route;
      closestDistance = distance;
    }
  });

  return closestRoute;
}

function distanceToRoute(px, py, x1, y1, cx, cy, x2, y2) {
  let best = Infinity;

  for (let i = 0; i <= 32; i += 1) {
    const p = quadraticPoint(x1, y1, cx, cy, x2, y2, i / 32);
    best = Math.min(best, Math.hypot(px - p.x, py - p.y));
  }

  return best;
}

function getRouteLabelPoint(route, view) {
  const from = getOrgan(route.from);
  const to = getOrgan(route.to);
  const a = toCanvas(from, view);
  const b = toCanvas(to, view);
  const cx = (a.x + b.x) / 2 + Math.sin(a.y + b.y) * view.w * 0.035;
  const cy = (a.y + b.y) / 2 - view.h * 0.035;

  return quadraticPoint(a.x, a.y, cx, cy, b.x, b.y, 0.5);
}

  function toCanvas(organ, view) {
    return {
      x: view.x + organ.x * view.w,
      y: view.y + organ.y * view.h
    };
  }

  function quadraticPoint(x1, y1, cx, cy, x2, y2, t) {
    const mt = 1 - t;
    return {
      x: mt * mt * x1 + 2 * mt * t * cx + t * t * x2,
      y: mt * mt * y1 + 2 * mt * t * cy + t * t * y2
    };
  }

  function drawLabel(ctx, text, x, y, color) {
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.font = `${Math.max(10, 11 * dpr)}px "Eurostile UI", "Eurostile", "Bahnschrift SemiCondensed", "Bahnschrift Condensed", Bahnschrift, system-ui, sans-serif`;
    const pad = 5 * dpr;
    const metrics = ctx.measureText(text);
    roundedRectPath(ctx, x - pad, y - 9 * dpr, metrics.width + pad * 2, 20 * dpr, 5 * dpr);
    ctx.fillStyle = "rgba(8, 10, 12, 0.78)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y + 1 * dpr);
    ctx.restore();
  }

  function roundedRectPath(ctx, x, y, width, height, radius) {
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
      return;
    }
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function mixColor(a, b, t) {
    const ca = hexToRgb(a);
    const cb = hexToRgb(b);
    const r = Math.round(ca.r + (cb.r - ca.r) * t);
    const g = Math.round(ca.g + (cb.g - ca.g) * t);
    const bl = Math.round(ca.b + (cb.b - ca.b) * t);
    return `rgb(${r}, ${g}, ${bl})`;
  }

  function hexToRgb(hex) {
    const value = hex.replace("#", "");
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  }

  function animate() {
    renderCanvas();
    requestAnimationFrame(animate);
  }

  setup();
})();
