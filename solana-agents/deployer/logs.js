const {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
  DescribeLogGroupsCommand,
} = require("@aws-sdk/client-cloudwatch-logs");

async function getAgentLogs(agentId, lines = 500) {
  const cloudWatchLogs = new CloudWatchLogsClient({
    region: process.env.AWS_REGION || "us-east-1",
  });

  console.log(`📊 [LOGS] Searching for logs for Solana agent: ${agentId}`);

  // First, try to find the actual log group name by listing log groups with the agent prefix
  let actualLogGroupName = null;
  try {
    const listCommand = new DescribeLogGroupsCommand({
      logGroupNamePrefix: `/aws/apprunner/solana-agent-${agentId}/`,
    });
    const listResponse = await cloudWatchLogs.send(listCommand);

    console.log(`📋 [LOGS] Found ${listResponse.logGroups?.length || 0} log groups`);

    if (listResponse.logGroups && listResponse.logGroups.length > 0) {
      // Find the application log group (it should contain 'application' in the name)
      const appLogGroup = listResponse.logGroups.find((lg) =>
        lg.logGroupName.includes("/application")
      );
      if (appLogGroup) {
        actualLogGroupName = appLogGroup.logGroupName;
        console.log(`✅ [LOGS] Found application log group: ${actualLogGroupName}`);
      } else {
        // If no application log group, use the first one
        actualLogGroupName = listResponse.logGroups[0].logGroupName;
        console.log(`📋 [LOGS] Using first available log group: ${actualLogGroupName}`);
      }
    }
  } catch (error) {
    console.error("❌ [LOGS] Error finding log group:", error.message);
  }

  // If we couldn't find the log group, construct the expected name
  if (!actualLogGroupName) {
    actualLogGroupName = `/aws/apprunner/solana-agent-${agentId}/application`;
    console.log(`🔍 [LOGS] Using constructed log group name: ${actualLogGroupName}`);
  }

  try {
    console.log(`📊 [LOGS] Fetching logs from: ${actualLogGroupName}`);
    console.log(`📋 [LOGS] Requesting last ${lines} events`);

    const command = new FilterLogEventsCommand({
      logGroupName: actualLogGroupName,
      limit: lines,
      startTime: Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
    });

    const response = await cloudWatchLogs.send(command);

    console.log(`✅ [LOGS] Retrieved ${response.events?.length || 0} log events`);

    const formattedLogs = (response.events || []).map((event) => ({
      timestamp: new Date(event.timestamp).toISOString(),
      message: event.message?.trim() || "",
      logStreamName: event.logStreamName,
    }));

    return {
      success: true,
      logGroupName: actualLogGroupName,
      totalEvents: formattedLogs.length,
      logs: formattedLogs,
      agentId: agentId,
      retrievedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ [LOGS] Error retrieving logs:`, error.message);
    
    // Return a structured error response
    return {
      success: false,
      logGroupName: actualLogGroupName,
      totalEvents: 0,
      logs: [],
      agentId: agentId,
      error: error.message,
      retrievedAt: new Date().toISOString(),
    };
  }
}

async function getLogGroups(agentId) {
  const cloudWatchLogs = new CloudWatchLogsClient({
    region: process.env.AWS_REGION || "us-east-1",
  });

  try {
    console.log(`📋 [LOGS] Listing all log groups for agent: ${agentId}`);

    const command = new DescribeLogGroupsCommand({
      logGroupNamePrefix: `/aws/apprunner/solana-agent-${agentId}/`,
    });

    const response = await cloudWatchLogs.send(command);

    const logGroups = (response.logGroups || []).map((lg) => ({
      name: lg.logGroupName,
      creationTime: new Date(lg.creationTime).toISOString(),
      storedBytes: lg.storedBytes || 0,
      retentionInDays: lg.retentionInDays,
    }));

    console.log(`✅ [LOGS] Found ${logGroups.length} log groups`);

    return {
      success: true,
      agentId: agentId,
      logGroups: logGroups,
      retrievedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ [LOGS] Error listing log groups:`, error.message);
    
    return {
      success: false,
      agentId: agentId,
      logGroups: [],
      error: error.message,
      retrievedAt: new Date().toISOString(),
    };
  }
}

async function getRecentLogs(agentId, minutes = 60) {
  const cloudWatchLogs = new CloudWatchLogsClient({
    region: process.env.AWS_REGION || "us-east-1",
  });

  const startTime = Date.now() - (minutes * 60 * 1000);
  const logGroupName = `/aws/apprunner/solana-agent-${agentId}/application`;

  try {
    console.log(`📊 [LOGS] Fetching recent logs (last ${minutes} minutes) for: ${agentId}`);

    const command = new FilterLogEventsCommand({
      logGroupName: logGroupName,
      startTime: startTime,
      limit: 1000,
    });

    const response = await cloudWatchLogs.send(command);

    const formattedLogs = (response.events || []).map((event) => ({
      timestamp: new Date(event.timestamp).toISOString(),
      message: event.message?.trim() || "",
      logStreamName: event.logStreamName,
    }));

    return {
      success: true,
      logGroupName: logGroupName,
      totalEvents: formattedLogs.length,
      logs: formattedLogs,
      agentId: agentId,
      timeRange: `Last ${minutes} minutes`,
      retrievedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ [LOGS] Error retrieving recent logs:`, error.message);
    
    return {
      success: false,
      logGroupName: logGroupName,
      totalEvents: 0,
      logs: [],
      agentId: agentId,
      error: error.message,
      retrievedAt: new Date().toISOString(),
    };
  }
}

module.exports = {
  getAgentLogs,
  getLogGroups,
  getRecentLogs,
};
