const API_URL = "/api/keywords";
const saveBtn = document.getElementById('save-btn');
const bulkDeleteBtn = document.getElementById('bulk-delete');
const selectAllCheckbox = document.getElementById('select-all');
const cardGrid = document.getElementById('card-grid');
const usernameInput = document.getElementById('username-input');
const channelTextarea = document.getElementById('channel-textarea');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageNumber = document.getElementById('page-number');
const channelDetailsContainer = document.getElementById('channel-details-container');

let currentPage = 1;
let totalPages = 1;

// Fetch keywords with pagination
async function fetchKeywords(page = 1) {
  try {
    const response = await fetch(`${API_URL}?page=${page}&limit=15`);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const result = await response.json();
    totalPages = result.totalPages || 1;
    displayKeywords(result.keywords || []);
    pageNumber.textContent = `Page ${currentPage} of ${totalPages}`;
  } catch (err) {
    console.error(`Error fetching keywords: ${err.message}`);
    cardGrid.innerHTML = '<p>Error loading keywords. Please try again later.</p>';
  }
}

// Display keywords as cards
function displayKeywords(keywords) {
  cardGrid.innerHTML = ''; // Clear existing cards
  if (keywords.length === 0) {
    cardGrid.innerHTML = '<p>No keywords available.</p>';
    return;
  }
  keywords.forEach((keyword) => {
    const card = document.createElement('div');
    card.classList.add('card');
    card.setAttribute('data-id', keyword._id);

    card.innerHTML = `
      <div class="card-container">
        <div class="card-header">
          <input type="checkbox" class="card-selector">
          <span class="username" style="cursor:pointer;">${keyword.username || "Unknown"}</span>
          <button class="delete-btn" onclick="deleteKeyword('${keyword._id}'); event.stopPropagation();">🗑</button>
        </div>
        <div class="card-body">
          <p>Channels: ${keyword.channels.map(channel => channel.name).join(', ') || "None"}</p>
        </div>
      </div>
    `;

    // Navigate to details page
    card.querySelector('.username').addEventListener('click', () => {
      window.location.href = `details.html?id=${keyword._id}`;
    });

    cardGrid.appendChild(card);
  });
}

// Handle pagination
prevPageBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    fetchKeywords(currentPage);
  }
});

nextPageBtn.addEventListener('click', () => {
  if (currentPage < totalPages) {
    currentPage++;
    fetchKeywords(currentPage);
  }
});

// Save new data
saveBtn.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  const channelNames = channelTextarea.value.trim().split(',').map(name => name.trim());

  if (!username || channelNames.length === 0) {
    return alert("Please provide both username and channel names.");
  }

  const validChannelNames = channelNames.every(name => /^[a-zA-Z0-9]+$/.test(name));
  if (!validChannelNames) {
    return alert("Channel names must be alphanumeric (e.g., channel01, channel02).");
  }

  try {
    // Check if the username exists in the database
    const response = await fetch(`${API_URL}?username=${username}`);
    const existingKeyword = await response.json();

    if (existingKeyword && existingKeyword._id) {
      // Username exists, update the channels array
      channelNames.forEach(channelName => {
        const channelExists = existingKeyword.channels.some(channel => channel.name === channelName);

        if (!channelExists) {
          // Add new channel to existing channels
          existingKeyword.channels.push({
            name: channelName,
            available: false,
            unavailable: false,
            createdAt: new Date().toISOString(),
          });
        }
      });

      // Update the channel count
      existingKeyword.channelcount = existingKeyword.channels.length.toString();

      // Update the keyword with the new channels array
      const updateResponse = await fetch(`${API_URL}/${existingKeyword._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(existingKeyword),
      });

      if (updateResponse.ok) {
        alert('Channels updated successfully!');
        fetchKeywords(currentPage);
      } else {
        const result = await updateResponse.json();
        alert(`Error: ${result.message}`);
      }
    } else {
      // Username doesn't exist, create a new entry
      const newKeyword = {
        username,
        channels: channelNames.map(name => ({
          name,
          available: false,
          unavailable: false,
          createdAt: new Date().toISOString(),
        })),
        createdBy: username,
      };

      const createResponse = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKeyword),
      });

      if (createResponse.ok) {
        alert('New keyword and channels created successfully!');
        fetchKeywords(currentPage);
      } else {
        const result = await createResponse.json();
        alert(`Error: ${result.message}`);
      }
    }
  } catch (err) {
    console.error('Error saving data:', err);
  }
});

// Bulk delete functionality
bulkDeleteBtn.addEventListener('click', async () => {
  const selectedCards = document.querySelectorAll('.card-selector:checked');
  const idsToDelete = Array.from(selectedCards).map(card => card.closest('.card').dataset.id);

  if (idsToDelete.length === 0) {
    return alert("Please select at least one item to delete.");
  }

  try {
    await Promise.all(idsToDelete.map(id => fetch(`${API_URL}?id=${id}`, { method: 'DELETE' })));
    alert("Selected items deleted successfully.");
    fetchKeywords(currentPage);
  } catch (err) {
    console.error('Error deleting keywords:', err);
  }
});

// Select all functionality
selectAllCheckbox.addEventListener('change', (e) => {
  const allCheckboxes = document.querySelectorAll('.card-selector');
  allCheckboxes.forEach(checkbox => checkbox.checked = e.target.checked);
});

// Delete a single keyword
async function deleteKeyword(id) {
  try {
    const response = await fetch(`${API_URL}?id=${id}`, { method: 'DELETE' });
    if (response.ok) {
      fetchKeywords(currentPage);
    } else {
      const error = await response.json();
      alert(`Error: ${error.message}`);
    }
  } catch (err) {
    console.error('Error deleting keyword:', err);
  }
}

// Display channel details on details page
async function displayChannelDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');

  // Check if the container exists
  if (!channelDetailsContainer) {
    console.error("Channel details container not found.");
    return;
  }

  if (!id) {
    return alert("No keyword ID provided.");
  }

  try {
    const response = await fetch(`${API_URL}?id=${id}`);
    if (!response.ok) throw new Error('Keyword not found.');
    const keyword = await response.json();

    channelDetailsContainer.innerHTML = `
      <h2>Details for ${keyword.username || "Unknown"}</h2>
      <p><strong>Created By:</strong> ${keyword.createdBy || "Unknown"}</p>
      <p><strong>Channel Count:</strong> ${keyword.channels?.length || 0}</p>
      <h3>Channels:</h3>
      <ul>
        ${keyword.channels?.map(channel => `
          <li>
            <strong>${channel.name || "Unnamed"}</strong>
            (Available: ${channel.available ? 'Yes' : 'No'}, Unavailable: ${channel.unavailable ? 'Yes' : 'No'})
          </li>
        `).join('') || "<li>No channels found.</li>"}
      </ul>
    `;
  } catch (err) {
    console.error('Error fetching channel details:', err);
    alert("Error fetching details.");
  }
}

// Initialize
if (window.location.pathname.includes('details.html')) {
  displayChannelDetails();
} else {
  fetchKeywords(currentPage);
}
