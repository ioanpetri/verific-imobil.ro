const config = {
  "version": "3.4.0",
  "name": "Algoritm de evaluare a unui apartament in Cluj-Napoca — octombrie 2026",
  "living": {
    "unit": 0.3,
    "building": 0.2,
    "location": 0.2,
    "environment": 0.2,
    "costs": 0.1
  },
  "livingComponents": {
    "unit": {
      "areaPerPerson": 0.25,
      "planEfficiency": 0.1,
      "light": 0.2,
      "floor": 0.1,
      "outdoor": 0.15,
      "parkingStorage": 0.2
    },
    "building": {
      "structure": 0.35,
      "energy": 0.3,
      "condition": 0.2,
      "density": 0.15
    },
    "location": {
      "commute": 0.35,
      "transit": 0.25,
      "services": 0.25,
      "schools": 0.15
    },
    "environment": {
      "noise": 0.3,
      "air": 0.15,
      "green": 0.25,
      "naturalRisks": 0.3
    }
  },
  "acquisition": {
    "value": 0.4,
    "entryCosts": 0.15,
    "liquidity": 0.15,
    "legal": 0.2,
    "negotiation": 0.05,
    "affordability": 0.05
  },
  "investment": {
    "yield": 0.25,
    "irrSpread": 0.25,
    "bear": 0.15,
    "rentalDemand": 0.2,
    "exitLiquidity": 0.1,
    "debtCoverage": 0.05
  },
  "profiles": {
    "home": {
      "living": 0.45,
      "acquisition": 0.3,
      "investment": 0.25
    },
    "mixed": {
      "living": 0.35,
      "acquisition": 0.3,
      "investment": 0.35
    },
    "investor": {
      "living": 0.15,
      "acquisition": 0.3,
      "investment": 0.55
    }
  },
  "normalization": {
    "yieldPct": [
      2.5,
      6.5
    ],
    "irrSpreadPct": [
      -2,
      5
    ],
    "bearIrrPct": [
      -3,
      5
    ],
    "valueGapPct": [
      -20,
      20
    ],
    "entryCostRatio": [
      1.15,
      1.03
    ],
    "dstI": [
      0.5,
      0.25
    ],
    "dscr": [
      1,
      1.5
    ]
  },
  "gates": {
    "seismic": {
      "livingMax": 4,
      "generalMax": 3.5
    },
    "legal": {
      "acquisitionMax": 3,
      "generalMax": 4
    },
    "naturalRisk": {
      "livingMax": 4,
      "generalMax": 5
    },
    "dstI": {
      "threshold": 0.5,
      "acquisitionMax": 5
    },
    "provisionalConfidence": 0.6
  },
  "evidenceConfidence": {
    "official": 1,
    "measured": 0.7,
    "estimated": 0.5,
    "assumed": 0.2
  },
  "calibration": {
    "targetCasesMin": 100,
    "targetCasesMax": 200,
    "frequency": "quarterly"
  }
};
export default config;
