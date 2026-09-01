import type { CS } from "./CheatData";

export const cheat3: CS[] = [
  { title: "Supervised vs Unsupervised", examPoints: ["Supervised: labelled → predict output","Unupervised: unlabelled → find structure"], remember: "Labels decide; you have them→supervised, you don't→unsupervised." },
  { title: "k-Means", def: "Partitional; assign→nearest centroid; recompute; repeat.", steps: ["Pick k","Init centroids","Assign points","Recompute","Stabilised"], formula: "centroid = mean(assigned points)", examPoints: ["Euclidean distance","Elbow method for k","Outlier-sensitive"], remember: "Find k centers, shuffle, repeat." },
  { title: "k-Medoids (PAM)", def: "Like k-means but center = actual data point.", examPoints: ["Real-point center, robust","Swap-based"], remember: "k-medoids = real point centroid." },
  { title: "Hierarchical", def: "Tree of clusters — merges(bottom-up)orsplits(top-down).", examPoints: ["Agglomerative = bottom-up","Linkage: single/complete/average","Dendrogram = nested tree"], remember: "Clusters nested family-tree style." },
  { title: "DBSCAN", def: "Density clusters: core/border/noise via ε and MinPts.", steps: ["Set ε, MinPts","Core if ≥MinPts in ε","Expand cluster","Else border/noise"], examPoints: ["Arbitrary shapes","Finds noise","No need to pick k"], remember: "Dense regions are clusters, sparse spots are noise." },
  { title: "MLE", def: "Pick params that best explain observed data.", steps: ["Model","Likelihood","Maximise"], examPoints: ["Maximise log-likelihood in practice"], remember: "Params that make the seen data most probable." },
];