const pipeline = [
  {
    $source: {
      documents: [
        { _id: 1, ip: "192.0.2.10", request_type: "GET", status: 200, bytes: 512 },
        { _id: 2, ip: "198.51.100.25", request_type: "POST", status: 201, bytes: 1042 },
        { _id: 3, ip: "203.0.113.42", request_type: "GET", status: 404, bytes: 0 }
      ]
    }
  },
  {
    $https: {
      connectionName: "ipinfo",
      method: "GET",
      as: "apiResults",
      path: "$ip"
    }
  },
  {
    $project: {
      _id: 1,
      ip: 1,
      request_type: 1,
      status: 1,
      bytes: 1,
      country: "$apiResults.country",
      region: "$apiResults.region",
      city: "$apiResults.city",
      loc: "$apiResults.loc"
    }
  },
  {
    $merge: {
      into: {
        connectionName: "atlas_lab",
        db: "playground",
        coll: "ip_traffic_enriched"
      },
      on: ["_id"],
      whenMatched: "replace",
      whenNotMatched: "insert"
    }
  }
];

sp.createStreamProcessor("labHttpEnrichment", pipeline);
