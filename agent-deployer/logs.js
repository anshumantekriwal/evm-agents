const {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
  DescribeLogGroupsCommand,
} = require("@aws-sdk/client-cloudwatch-logs");

async function getAgentLogs(agentId, lines = 500) {
  const cloudWatchLogs = new CloudWatchLogsClient({
    region: process.env.AWS_REGION,
  });

  // First, try to find the actual log group name by listing log groups with the agent prefix
  let actualLogGroupName = null;
  try {
    const listCommand = new DescribeLogGroupsCommand({
      logGroupNamePrefix: `/aws/apprunner/evm-${agentId}/`,
    });
    const listResponse = await cloudWatchLogs.send(listCommand);

    if (listResponse.logGroups && listResponse.logGroups.length > 0) {
      // Find the application log group (it should contain 'application' in the name)
      const appLogGroup = listResponse.logGroups.find((lg) =>
        lg.logGroupName.includes("/application")
      );
      if (appLogGroup) {
        actualLogGroupName = appLogGroup.logGroupName;
      }
    }
  } catch (error) {
    console.error("Error finding log group:", error);
  }

  if (!actualLogGroupName) {
    return {
      logGroupName: `/aws/apprunner/evm-${agentId}/application`,
      events: [],
      totalEvents: 0,
      message:
        "No logs found for this agent. The agent might not have started yet or no logs have been generated.",
      timestamp: new Date().toISOString(),
    };
  }

  try {
    // Get all events first, then sort by timestamp descending to get latest first
    const params = {
      logGroupName: actualLogGroupName,
      limit: Math.min(lines * 2, 10000), // Get more events initially to ensure we have enough after sorting
      startFromHead: true, // Get all events
    };

    const command = new FilterLogEventsCommand(params);
    const response = await cloudWatchLogs.send(command);

    // Get all events by paginating through results
    let allEvents = response.events || [];
    let nextToken = response.nextToken;

    // Continue fetching until we have enough events or no more tokens
    while (nextToken && allEvents.length < lines * 2) {
      const nextParams = { ...params, nextToken };
      const nextCommand = new FilterLogEventsCommand(nextParams);
      const nextResponse = await cloudWatchLogs.send(nextCommand);

      allEvents = allEvents.concat(nextResponse.events || []);
      nextToken = nextResponse.nextToken;
    }

    // Sort events by timestamp descending (latest first)
    allEvents.sort((a, b) => b.timestamp - a.timestamp);

    // Take only the requested number of lines
    const recentEvents = allEvents.slice(0, lines);

    return {
      logGroupName: actualLogGroupName,
      events: recentEvents,
      totalEvents: recentEvents.length,
      timestamp: new Date().toISOString(),
      requestedLines: lines,
    };
  } catch (error) {
    console.error("Error fetching logs:", error);
    return {
      logGroupName: actualLogGroupName,
      events: [],
      totalEvents: 0,
      message: "Error fetching logs from CloudWatch.",
      timestamp: new Date().toISOString(),
      error: error.message,
    };
  }
}

async function streamAgentLogs(agentId, ws, lines = 500) {
  const cloudWatchLogs = new CloudWatchLogsClient({
    region: process.env.AWS_REGION,
  });

  // Find the log group
  let actualLogGroupName = null;
  try {
    const listCommand = new DescribeLogGroupsCommand({
      logGroupNamePrefix: `/aws/apprunner/evm-${agentId}/`,
    });
    const listResponse = await cloudWatchLogs.send(listCommand);

    if (listResponse.logGroups && listResponse.logGroups.length > 0) {
      const appLogGroup = listResponse.logGroups.find((lg) =>
        lg.logGroupName.includes("/application")
      );
      if (appLogGroup) {
        actualLogGroupName = appLogGroup.logGroupName;
      }
    }
  } catch (error) {
    console.error("Error finding log group:", error);
    ws.send(JSON.stringify({ error: "Log group not found" }));
    return;
  }

  if (!actualLogGroupName) {
    ws.send(JSON.stringify({ error: "No logs found for this agent" }));
    return;
  }

  // Send initial batch of logs
  try {
    const initialLogs = await getAgentLogs(agentId, lines);
    ws.send(JSON.stringify({ type: "initial", logs: initialLogs }));
  } catch (error) {
    ws.send(JSON.stringify({ error: "Failed to fetch initial logs" }));
    return;
  }

  // Set up polling for new logs
  let lastTimestamp = Date.now();
  const pollInterval = setInterval(async () => {
    try {
      const params = {
        logGroupName: actualLogGroupName,
        startTime: lastTimestamp,
        limit: 100,
        startFromHead: false,
      };

      const command = new FilterLogEventsCommand(params);
      const response = await cloudWatchLogs.send(command);

      if (response.events && response.events.length > 0) {
        // Sort by timestamp descending (latest first)
        const newEvents = response.events.sort(
          (a, b) => b.timestamp - a.timestamp
        );

        // Update last timestamp
        lastTimestamp = Math.max(...newEvents.map((e) => e.timestamp)) + 1;

        ws.send(
          JSON.stringify({
            type: "update",
            events: newEvents,
            timestamp: new Date().toISOString(),
          })
        );
      }
    } catch (error) {
      console.error("Error polling for new logs:", error);
      ws.send(JSON.stringify({ error: "Error fetching new logs" }));
    }
  }, 5000); // Poll every 5 seconds

  // Clean up on WebSocket close
  ws.on("close", () => {
    clearInterval(pollInterval);
    console.log(`📊 [LOGS] WebSocket closed for agent ${agentId}`);
  });

  ws.on("error", (error) => {
    clearInterval(pollInterval);
    console.error(`❌ [LOGS] WebSocket error for agent ${agentId}:`, error);
  });
}

module.exports = {
  getAgentLogs,
  streamAgentLogs,
};
