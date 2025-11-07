// ---------------- Global Body Reference ----------------
const body = document.body;

// ---------------- Chatbot with Enhanced Error Handling ----------------
const sendBtn = document.getElementById('sendBtn');
const chatInput = document.getElementById('chatInput');
const chatOutput = document.getElementById('chatOutput');

if (sendBtn && chatInput && chatOutput) {
  // Add welcome message when chatbot page loads
  if (chatOutput.children.length === 0) {
    const welcomeMsg = document.createElement('p');
    welcomeMsg.textContent = "Hello! I'm MindCare, your mental health assistant. How are you feeling today?";
    welcomeMsg.classList.add('chat-message', 'MindCare', 'fade-in');
    chatOutput.appendChild(welcomeMsg);
  }

  sendBtn.addEventListener('click', sendMessage);
  
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Display user message with fade-in
    const userMsg = document.createElement('p');
    userMsg.textContent = message;
    userMsg.classList.add('chat-message', 'You', 'fade-in');
    chatOutput.appendChild(userMsg);

    // Clear input and scroll to bottom
    chatInput.value = '';
    chatOutput.scrollTop = chatOutput.scrollHeight;

    // Show typing indicator
    const typingIndicator = document.createElement('p');
    typingIndicator.textContent = "MindCare is typing...";
    typingIndicator.classList.add('chat-message', 'MindCare', 'typing');
    typingIndicator.id = 'typingIndicator';
    chatOutput.appendChild(typingIndicator);
    chatOutput.scrollTop = chatOutput.scrollHeight;

    try {
      console.log('📤 Sending message to chatbot...');
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ message })
      });

      // Remove typing indicator
      const typingElem = document.getElementById('typingIndicator');
      if (typingElem) typingElem.remove();

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Server error' }));
        const error = new Error(errorData.error || `HTTP error! status: ${res.status}`);
        error.status = res.status;
        error.data = errorData;
        throw error;
      }

      const data = await res.json();
      console.log('📥 Received response:', data);

      if (data.success && data.reply) {
        // Display AI response with fade-in
        const botMsg = document.createElement('p');
        botMsg.textContent = data.reply;
        botMsg.classList.add('chat-message', 'MindCare', 'fade-in');
        chatOutput.appendChild(botMsg);
      } else {
        throw new Error(data.error || 'Invalid response from server');
      }

    } catch (err) {
      console.error('❌ Chatbot error:', err);
      console.error('❌ Error details:', {
        message: err.message,
        status: err.status,
        data: err.data
      });
      
      // Remove typing indicator if still present
      const typingElem = document.getElementById('typingIndicator');
      if (typingElem) typingElem.remove();

      const errMsg = document.createElement('p');
      let errorText = "😔 Sorry, I'm having trouble responding right now. Please try again.";
      
      // Handle specific error cases
      if (err.message.includes('Failed to fetch') || err.message.includes('Network') || err.message.includes('network')) {
        errorText = "🌐 Network error: Please check your internet connection and try again.";
      } else if (err.message.includes('API key') || err.message.includes('Invalid API key')) {
        errorText = "🔑 API configuration error: Please contact the administrator.";
      } else if (err.message.includes('quota') || err.message.includes('Quota')) {
        errorText = "💳 API quota exceeded. Please contact the administrator or try again later.";
      } else if (err.status === 429 || err.message.includes('rate limit') || err.message.includes('Too many requests')) {
        errorText = "⏱️ Too many requests. Please wait a moment and try again.";
      } else if (err.status === 503 || err.message.includes('unavailable')) {
        errorText = "🔧 Service temporarily unavailable. Please try again in a moment.";
      } else if (err.message && err.message !== 'Invalid response from server') {
        // Use the server-provided error message if available
        errorText = `⚠️ ${err.message}`;
      }
      
      errMsg.textContent = errorText;
      errMsg.classList.add('chat-message', 'error', 'fade-in');
      chatOutput.appendChild(errMsg);
    } finally {
      chatOutput.scrollTop = chatOutput.scrollHeight;
    }
  }
}

// ---------------- Mood Tracker ----------------
const logMoodBtn = document.getElementById('logMood');
const moodSelect = document.getElementById('moodSelect');
const moodHistory = document.getElementById('moodHistory');

let moods = [];
let moodChart;

// ---------------- Background Gradients ----------------
const moodGradients = {
  happy: "linear-gradient(135deg, #ffd89b, #19547b)",
  neutral: "linear-gradient(135deg, #ece9e6, #ffffff)",
  sad: "linear-gradient(135deg, #89f7fe, #66a6ff)",
  anxious: "linear-gradient(135deg, #f7971e, #ffd200)",
  angry: "linear-gradient(135deg, #f85032, #e73827)"
};

let hue = 0;
function animateBackground() {
  if (!document.getElementById('moodSelect')) return; // Only animate on mood tracker page
  
  hue = (hue + 0.2) % 360;
  body.style.background = `linear-gradient(135deg, hsl(${hue}, 70%, 80%), hsl(${(hue + 60) % 360}, 70%, 85%))`;
  requestAnimationFrame(animateBackground);
}

// Only start animation if we're on a page with mood tracking
if (document.getElementById('moodSelect')) {
  animateBackground();
}

function updateBackground(mood) {
  const gradient = moodGradients[mood] || `linear-gradient(135deg, #f0f8ff, #e0f7fa)`;
  body.style.background = gradient;
  body.style.transition = "background 1s ease-in-out";
  
  // Restart animation after 4 seconds
  setTimeout(() => {
    if (document.getElementById('moodSelect')) {
      animateBackground();
    }
  }, 4000);
}

function moodValue(mood) {
  const moodValues = {
    'angry': 1,
    'anxious': 2,
    'sad': 3,
    'neutral': 4,
    'happy': 5
  };
  return moodValues[mood] || 3;
}

function updateChart() {
  const chartCanvas = document.getElementById('moodChart');
  if (!chartCanvas) return;

  // Use only last 7 entries for better visibility
  const recentMoods = moods.slice(0, 7).reverse();
  const labels = recentMoods.map(m => {
    const date = new Date(m.logged_at);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const data = recentMoods.map(m => m.mood_value);

  if (!moodChart) {
    const ctx = chartCanvas.getContext('2d');
    moodChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Mood Level',
          data: data,
          backgroundColor: 'rgba(102, 126, 234, 0.2)',
          borderColor: '#667eea',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#667eea',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 1,
            max: 5,
            ticks: {
              stepSize: 1,
              callback: function (value) {
                const moodLabels = {
                  1: '😡 Angry',
                  2: '😟 Anxious', 
                  3: '😔 Sad',
                  4: '😐 Neutral',
                  5: '😊 Happy'
                };
                return moodLabels[value] || value;
              }
            },
            grid: {
              color: 'rgba(0,0,0,0.1)'
            }
          },
          x: {
            grid: {
              color: 'rgba(0,0,0,0.1)'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  } else {
    moodChart.data.labels = labels;
    moodChart.data.datasets[0].data = data;
    moodChart.update();
  }
}

async function loadMoods() {
  try {
    const res = await fetch('/api/moods');
    if (!res.ok) throw new Error('Failed to fetch moods');
    
    const data = await res.json();
    moods = (data.success && Array.isArray(data.data)) ? data.data : [];
    displayMoodHistory();
    updateChart();
  } catch (err) {
    console.error("❌ Failed to load moods:", err);
    if (moodHistory) {
      moodHistory.innerHTML = '<p class="error">Failed to load mood history</p>';
    }
  }
}

// ---------------- Mood History Animation ----------------
function displayMoodHistory() {
  if (!moodHistory) return;
  
  moodHistory.innerHTML = '';
  
  if (moods.length === 0) {
    moodHistory.innerHTML = '<p class="no-data">No mood entries yet. Start tracking your mood!</p>';
    return;
  }

  moods.forEach((m, index) => {
    const entry = document.createElement('div');
    entry.className = 'mood-entry';
    entry.innerHTML = `
      <span class="mood-emoji">${getMoodEmoji(m.mood)}</span>
      <span class="mood-text">${m.mood}</span>
      <span class="mood-date">${formatDate(m.logged_at)}</span>
      <button class="deleteBtn" title="Delete entry">🗑️</button>
    `;
    entry.classList.add('fade-in-slide');
    entry.style.animationDelay = `${index * 100}ms`;
    moodHistory.appendChild(entry);

    entry.querySelector('.deleteBtn').addEventListener('click', async () => {
      if (confirm('Delete this mood entry?')) {
        try {
          const res = await fetch(`/api/moods/${m.id}`, { 
            method: 'DELETE' 
          });
          
          if (res.ok) {
            moods = moods.filter(item => item.id !== m.id);
            displayMoodHistory();
            updateChart();
          } else {
            throw new Error('Failed to delete');
          }
        } catch (err) {
          console.error("❌ Failed to delete mood:", err);
          alert('Failed to delete mood entry. Please try again.');
        }
      }
    });
  });
}

function getMoodEmoji(mood) {
  const emojis = {
    'happy': '😊',
    'sad': '😔',
    'angry': '😡',
    'anxious': '😟',
    'neutral': '😐'
  };
  return emojis[mood] || '😐';
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

if (logMoodBtn && moodSelect) {
  logMoodBtn.addEventListener('click', async () => {
    const mood = moodSelect.value;
    if (!mood) {
      alert("Please select a mood first.");
      return;
    }

    try {
      const res = await fetch('/api/moods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mood, 
          mood_value: moodValue(mood) 
        })
      });

      const result = await res.json();
      
      if (result.success) {
        // Add new mood to the beginning of the array
        moods.unshift({ 
          id: result.id, 
          mood, 
          mood_value: moodValue(mood), 
          logged_at: new Date().toISOString() 
        });
        
        displayMoodHistory();
        updateChart();
        updateBackground(mood);
        moodSelect.value = '';
        
        // Show success feedback
        logMoodBtn.textContent = '✓ Logged!';
        setTimeout(() => {
          logMoodBtn.textContent = 'Log Mood';
        }, 2000);
      } else {
        throw new Error(result.error || 'Failed to log mood');
      }
    } catch (err) {
      console.error("❌ Failed to log mood:", err);
      alert('Failed to log mood. Please try again.');
    }
  });
}

// ---------------- Contact Form ----------------
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Your message has been sent! Thank you for reaching out.');
    contactForm.reset();
  });
}

// ---------------- Home Page Animations ----------------
const statsCards = document.querySelectorAll('.stat-card');
if (statsCards.length) {
  statsCards.forEach((card, i) => {
    setTimeout(() => {
      card.style.transform = 'translateY(0)';
      card.style.opacity = 1;
    }, i * 200);
  });
}

// ---------------- Authentication Helper ----------------
function getAuthToken() {
  return localStorage.getItem('token');
}

function getAuthHeaders() {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
}

function checkAuth() {
  const token = getAuthToken();
  if (!token) {
    window.location.href = '/login';
    return false;
  }
  return true;
}

// ---------------- Journal Feature ----------------
const journalForm = document.getElementById('journalForm');
if (journalForm) {
  journalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!checkAuth()) return;
    
    const title = document.getElementById('journalTitle').value.trim();
    const content = document.getElementById('journalContent').value.trim();
    
    if (!content) {
      alert('Please write something in your journal entry.');
      return;
    }

    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          title: title || 'Untitled', 
          content 
        })
      });
      
      const result = await res.json();
      
      if (result.success) {
        alert('Journal entry saved successfully!');
        journalForm.reset();
        if (typeof loadJournalEntries === 'function') {
          loadJournalEntries();
        }
      } else {
        if (result.error && result.error.includes('Authentication')) {
          window.location.href = '/login';
        } else {
          throw new Error(result.error || 'Failed to save entry');
        }
      }
    } catch (err) {
      console.error('❌ Error saving journal entry:', err);
      alert('Failed to save journal entry. Please try again.');
    }
  });
}

const journalList = document.getElementById('journalList');
async function loadJournalEntries() {
  if (!journalList) return;
  
  if (!checkAuth()) return;
  
  try {
    const res = await fetch('/api/journal', {
      headers: getAuthHeaders()
    });
    
    if (res.status === 401 || res.status === 403) {
      window.location.href = '/login';
      return;
    }
    
    if (!res.ok) throw new Error('Failed to fetch journal entries');
    
    const response = await res.json();
    const entries = (response.success && Array.isArray(response.data)) ? response.data : [];
    journalList.innerHTML = '';
    
    if (!entries || entries.length === 0) {
      journalList.innerHTML = '<div class="no-data" style="grid-column: 1 / -1;"><p>No journal entries yet. Start writing!</p></div>';
      return;
    }

    entries.forEach((entry, index) => {
      const div = document.createElement('div');
      // Use journal-card for grid layout in journal-folder, journal-entry for other layouts
      const isGridLayout = journalList.id === 'journalList' && journalList.closest('.journal-container');
      div.classList.add(isGridLayout ? 'journal-card' : 'journal-entry', 'fade-in');
      div.style.animationDelay = `${index * 0.1}s`;
      div.innerHTML = `
        <h${isGridLayout ? '4' : '3'}>${escapeHtml(entry.title || 'Untitled')}</h${isGridLayout ? '4' : '3'}>
        <p>${escapeHtml(entry.content)}</p>
        <small>${new Date(entry.created_at).toLocaleString()}</small>
        <button class="deleteJournal" data-id="${entry.id}" title="Delete entry">Delete Entry</button>
      `;
      journalList.appendChild(div);
    });

    document.querySelectorAll('.deleteJournal').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this journal entry?')) {
          try {
            const res = await fetch(`/api/journal/${id}`, { 
              method: 'DELETE',
              headers: getAuthHeaders()
            });
            
            if (res.status === 401 || res.status === 403) {
              window.location.href = '/login';
              return;
            }
            
            if (res.ok) {
              loadJournalEntries();
            } else {
              throw new Error('Failed to delete');
            }
          } catch (err) {
            console.error('❌ Error deleting journal entry:', err);
            alert('Failed to delete journal entry. Please try again.');
          }
        }
      });
    });
  } catch (err) {
    console.error('❌ Error loading journal entries:', err);
    journalList.innerHTML = '<p class="error">Failed to load journal entries</p>';
  }
}

// Utility function to prevent XSS
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ---------------- Initialize ----------------
document.addEventListener('DOMContentLoaded', function() {
  // Only load features if we're on the relevant pages
  if (document.getElementById('moodHistory')) {
    loadMoods();
  }
  
  if (document.getElementById('journalList')) {
    loadJournalEntries();
  }
  
  console.log('🚀 MindCare frontend initialized');
});