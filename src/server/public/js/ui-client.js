document.addEventListener("DOMContentLoaded", () => {
  const totalJokes = document.getElementById("total-jokes");
  const totalTranslations = document.getElementById("total-translations");
  const activeConnections = document.getElementById("active-connections");
  const avgTime = document.getElementById("avg-time");
  const clientCount = document.getElementById("client-count");
  const clientConnectionsBody = document.getElementById(
    "client-connections-tbody"
  );

  // Initialize SSE connection
  const evtSource = new EventSource("/stats");

  // Handle incoming SSE messages
  evtSource.onmessage = (event) => {
    try {
      const stats = JSON.parse(event.data);
      updateStats(stats);
    } catch (error) {
      console.error("Error parsing SSE data:", error);
    }
  };

  // Handle SSE connection errors
  evtSource.onerror = (error) => {
    console.error("EventSource error:", error);
    // Attempt to reconnect after a delay
    setTimeout(() => {
      location.reload();
    }, 5000);
  };

  // Update UI with the latest statistics
  function updateStats(stats) {
    // Update overall statistics
    totalJokes.textContent = stats.totalJokesSent;
    totalTranslations.textContent = stats.totalTranslationsReceived;
    activeConnections.textContent = stats.currentlyActiveConnections;
    avgTime.textContent = formatNumber(stats.overallAverageTranslationTimeMs);

    // Update client connections table
    const connections = stats.clientConnections;
    clientCount.textContent = connections.length;

    if (connections.length === 0) {
      clientConnectionsBody.innerHTML = `
                <tr>
                    <td colspan="7" class="no-data">No clients connected yet</td>
                </tr>
            `;
      return;
    }

    // Generate table rows for each client
    clientConnectionsBody.innerHTML = connections
      .map(
        (client) => `
            <tr>
                <td>${client.clientId}</td>
                <td class="status-${client.status}">${client.status}</td>
                <td>${client.jokesSent}</td>
                <td>${client.translationsReceived}</td>
                <td>${formatNumber(client.avgTranslationTimeMs)}</td>
                <td>${formatTimestamp(client.connectedAt)}</td>
                <td>${
                  client.disconnectedAt
                    ? formatTimestamp(client.disconnectedAt)
                    : "-"
                }</td>
            </tr>
        `
      )
      .join("");
  }

  function formatTimestamp(isoString) {
    try {
      const date = new Date(isoString);
      return date.toLocaleString();
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return isoString || "-";
    }
  }

  function formatNumber(num) {
    return Number.isFinite(num) ? num.toFixed(2) : "0.00";
  }
});
