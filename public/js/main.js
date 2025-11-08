// ---------------- Global Body Reference ----------------
const body = document.body;

// ---------------- Mobile Menu Toggle ----------------
document.addEventListener('DOMContentLoaded', function() {
  const menuToggle = document.getElementById('menuToggle');
  const nav = document.querySelector('header nav');
  const menuOverlay = document.getElementById('menuOverlay');
  
  if (menuToggle && nav) {
    menuToggle.addEventListener('click', function() {
      menuToggle.classList.toggle('active');
      nav.classList.toggle('active');
      if (menuOverlay) {
        menuOverlay.classList.toggle('active');
      }
      document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
    });

    // Close menu when clicking overlay
    if (menuOverlay) {
      menuOverlay.addEventListener('click', function() {
        menuToggle.classList.remove('active');
        nav.classList.remove('active');
        menuOverlay.classList.remove('active');
        document.body.style.overflow = '';
      });
    }

    // Close menu when clicking a link
    const navLinks = nav.querySelectorAll('a');
    navLinks.forEach(link => {
      link.addEventListener('click', function() {
        menuToggle.classList.remove('active');
        nav.classList.remove('active');
        if (menuOverlay) {
          menuOverlay.classList.remove('active');
        }
        document.body.style.overflow = '';
      });
    });
  }
});

// ---------------- API Configuration ----------------
const API_BASE_URL = 'http://localhost:3000';

// Helper function to get API base URL (works with or without server)
function getApiBaseUrl() {
  // Try to detect if we're on Node.js server or Live Server
  const currentPort = window.location.port;
  if (currentPort === '3000') {
    return ''; // Same origin
  }
  // Default to localhost:3000 for API calls
  return API_BASE_URL;
}

// ---------------- Chatbot with Enhanced Error Handling ----------------
const sendBtn = document.getElementById('sendBtn');
const chatInput = document.getElementById('chatInput');
const chatOutput = document.getElementById('chatOutput');

if (sendBtn && chatInput && chatOutput) {
  // Check server connection status
  const serverStatus = document.getElementById('serverStatus');
  const statusIcon = document.getElementById('statusIcon');
  const statusText = document.getElementById('statusText');
  
  // Function to check server status
  async function checkServerStatus() {
    if (!serverStatus || !statusIcon || !statusText) return;
    
    try {
      const apiBaseUrl = getApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/api/health`, {
        method: 'GET',
        mode: 'cors'
      }).catch(() => null);
      
      if (res && res.ok) {
        serverStatus.style.display = 'none'; // Hide if server is running
      } else {
        throw new Error('Server not accessible');
      }
    } catch (err) {
      // Server is not running or not accessible - show friendly offline mode
      serverStatus.style.display = 'block';
      statusIcon.textContent = '💬';
      statusText.textContent = 'Offline mode: You can still chat! Responses will be helpful but limited. Start the server for full AI-powered responses.';
      serverStatus.style.background = '#fff3cd';
      serverStatus.style.borderLeftColor = '#ffc107';
      serverStatus.style.color = '#856404';
    }
  }
  
  // Check server status on page load (don't block the UI)
  setTimeout(checkServerStatus, 500);
  
  // Add welcome message when chatbot page loads
  if (chatOutput.children.length === 0) {
    const welcomeMsg = document.createElement('p');
    welcomeMsg.textContent = "Hello! I'm MindCare, your mental health assistant. How are you feeling today?";
    welcomeMsg.classList.add('chat-message', 'MindCare', 'fade-in');
    chatOutput.appendChild(welcomeMsg);
  }

  sendBtn.addEventListener('click', sendMessage);
  
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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
      
      // Get API base URL (same as mood tracker)
      const apiBaseUrl = getApiBaseUrl();
      const apiUrl = `${apiBaseUrl}/api/chat`;
      
      console.log('🔗 Chat API URL:', apiUrl);
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify({ message })
      });

      // Remove typing indicator
      const typingElem = document.getElementById('typingIndicator');
      if (typingElem) typingElem.remove();

      // Read response as text first
      const responseText = await res.text();

      if (!res.ok) {
        let errorMessage = `Server error: ${res.status} ${res.statusText}`;
        try {
          if (responseText && responseText.trim() !== '') {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.error || errorData.message || errorMessage;
          }
        } catch (parseError) {
          if (responseText && responseText.trim() !== '') {
            errorMessage = responseText;
          }
        }
        const error = new Error(errorMessage);
        error.status = res.status;
        throw error;
      }

      // Parse JSON response
      let data;
      try {
        if (!responseText || responseText.trim() === '') {
          throw new Error('Empty response from server');
        }
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing chat response:', parseError);
        throw new Error('Invalid response from server');
      }

      console.log('📥 Received response:', data);

      if (data.success && data.reply) {
        // Display AI response with fade-in
        const botMsg = document.createElement('p');
        botMsg.textContent = data.reply;
        botMsg.classList.add('chat-message', 'MindCare', 'fade-in');
        chatOutput.appendChild(botMsg);
        
        // Update server status if it was showing offline
        const serverStatus = document.getElementById('serverStatus');
        if (serverStatus && serverStatus.style.display !== 'none') {
          serverStatus.style.display = 'none';
        }
      } else {
        throw new Error(data.error || 'Invalid response from server');
      }

    } catch (err) {
      console.error('❌ Chatbot error:', err);
      console.error('❌ Error details:', {
        message: err.message,
        status: err.status,
        name: err.name
      });
      
      // Remove typing indicator if still present
      const typingElem = document.getElementById('typingIndicator');
      if (typingElem) typingElem.remove();

      // Handle connection errors gracefully with helpful fallback responses
      if (err.message.includes('Failed to fetch') || 
          err.message.includes('NetworkError') || 
          err.message.includes('network') ||
          err.name === 'TypeError' && err.message.includes('fetch')) {
        
        // Provide helpful fallback responses based on common questions
        const userMessage = message.toLowerCase();
        let fallbackResponse = "";
        
        if (userMessage.includes('hello') || userMessage.includes('hi') || userMessage.includes('hey')) {
          fallbackResponse = "Hello! I'm MindCare, your mental health assistant. I'm currently in offline mode. " +
                           "To get full AI-powered responses, please start the server by running 'node server.js' in the terminal. " +
                           "In the meantime, feel free to explore our resources and mood tracker!";
        } else if (userMessage.includes('sad') || userMessage.includes('depressed') || userMessage.includes('down')) {
          fallbackResponse = "I'm here for you. Remember that it's okay to feel sad sometimes. " +
                           "Consider trying our mood tracker to track your feelings, or check out our resources page for support. " +
                           "If you're in crisis, please reach out to a mental health professional or call a crisis hotline.";
        } else if (userMessage.includes('anxious') || userMessage.includes('anxiety') || userMessage.includes('worried')) {
          fallbackResponse = "Anxiety can be challenging. Try some deep breathing exercises: " +
                           "Breathe in for 4 counts, hold for 4, and exhale for 4. " +
                           "The mood tracker can help you identify patterns in your anxiety.";
        } else if (userMessage.includes('help') || userMessage.includes('support')) {
          fallbackResponse = "I'm here to help! You can: " +
                           "1) Track your mood daily using our mood tracker, " +
                           "2) Read helpful resources on our resources page, " +
                           "3) Contact us through the contact page. " +
                           "For full AI-powered responses, please start the server.";
        } else {
          fallbackResponse = "I'm currently in offline mode. For personalized AI responses, " +
                           "please start the Node.js server by running 'node server.js' in the terminal. " +
                           "In the meantime, you can use our mood tracker and resources pages!";
        }
        
        // Display the helpful fallback response instead of an error
        const botMsg = document.createElement('p');
        botMsg.textContent = fallbackResponse;
        botMsg.classList.add('chat-message', 'MindCare', 'fade-in');
        botMsg.style.opacity = '0.8'; // Slightly dimmed to indicate offline mode
        chatOutput.appendChild(botMsg);
        
      } else {
        // For other errors, show appropriate messages
        const errMsg = document.createElement('p');
        let errorText = "😔 Sorry, I'm having trouble responding right now.";
        
        if (err.message.includes('API key') || err.message.includes('Invalid API key') || err.message.includes('not configured')) {
          errorText = "🔑 The AI service needs to be configured. Please contact the administrator.";
        } else if (err.message.includes('quota') || err.message.includes('Quota')) {
          errorText = "💳 API quota exceeded. Please try again later.";
        } else if (err.status === 429 || err.message.includes('rate limit') || err.message.includes('Too many requests')) {
          errorText = "⏱️ Too many requests. Please wait a moment and try again.";
        } else if (err.status === 503 || err.message.includes('unavailable')) {
          errorText = "🔧 Service temporarily unavailable. Please try again in a moment.";
        } else if (err.message && err.message !== 'Invalid response from server') {
          errorText = `⚠️ ${err.message}`;
        }
        
        errMsg.textContent = errorText;
        errMsg.classList.add('chat-message', 'error', 'fade-in');
        chatOutput.appendChild(errMsg);
      }
    } finally {
      chatOutput.scrollTop = chatOutput.scrollHeight;
    }
  }
}

// ---------------- Mood Tracker ---------------- 
let logMoodBtn;
let moodSelect;
let moodHistory;
let moods = [];
let moodChart;

// Initialize mood tracker elements after DOM loads
function initMoodTracker() {
  logMoodBtn = document.getElementById('logMood');
  moodSelect = document.getElementById('moodSelect');
  moodHistory = document.getElementById('moodHistory');
  
  console.log('🔍 Mood tracker initialization:', {
    logMoodBtn: !!logMoodBtn,
    moodSelect: !!moodSelect,
    moodHistory: !!moodHistory
  });
  
  if (logMoodBtn && moodSelect && moodHistory) {
    console.log('✅ Mood tracker elements found - setting up...');
    setupMoodTracker();
  } else {
    console.warn('⚠️ Mood tracker elements not found on this page');
    // Try again after a short delay in case DOM isn't fully ready
    if (document.getElementById('moodHistory')) {
      setTimeout(() => {
        console.log('🔄 Retrying mood tracker initialization...');
        initMoodTracker();
      }, 100);
    }
  }
}

// ---------------- Background Gradients ----------------
const moodGradients = {
  happy: "linear-gradient(135deg, #ffd89b, #19547b)",
  neutral: "linear-gradient(135deg, #ece9e6, #ffffff)",
  sad: "linear-gradient(135deg, #89f7fe, #66a6ff)",
  anxious: "linear-gradient(135deg, #f7971e, #ffd200)",
  angry: "linear-gradient(135deg, #f85032, #e73827)"
};

// Background animation disabled - using CSS gradient instead
// This prevents conflicts with the global CSS background
function updateBackground(mood) {
  // Optional: Add a subtle overlay effect instead of changing entire background
  // The CSS gradient background will remain
  console.log(`Mood logged: ${mood}`);
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
  if (!chartCanvas) {
    console.warn('Chart canvas not found');
    return;
  }

  // Check if Chart.js is loaded
  if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded. Please check the CDN link.');
    return;
  }

  // Use all entries, or last 14 for better visibility
  const recentMoods = moods.length > 14 ? moods.slice(0, 14).reverse() : [...moods].reverse();
  
  // Handle empty data
  const container = chartCanvas.parentElement;
  if (recentMoods.length === 0) {
    // Destroy existing chart if no data
    if (moodChart) {
      moodChart.destroy();
      moodChart = null;
    }
    // Show placeholder message in the canvas container instead
    if (container) {
      // Remove existing placeholder if any
      const existingPlaceholder = container.querySelector('.no-data');
      if (existingPlaceholder) {
        existingPlaceholder.remove();
      }
      
      const placeholder = document.createElement('div');
      placeholder.className = 'no-data';
      placeholder.style.cssText = 'text-align: center; color: #888; padding: 3rem 2rem; font-style: italic; background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1)); border-radius: 12px; border: 2px dashed rgba(102, 126, 234, 0.3);';
      placeholder.innerHTML = '<p style="font-size: 1.1rem; margin-bottom: 0.5rem;">📊 No mood data yet</p><p style="font-size: 0.9rem;">Log your first mood to see an awesome graph!</p>';
      
      // Hide canvas and show placeholder
      chartCanvas.style.display = 'none';
      container.appendChild(placeholder);
    }
    return;
  }
  
  // Show canvas if it was hidden and remove placeholder
  if (container) {
    const placeholder = container.querySelector('.no-data');
    if (placeholder) {
      placeholder.remove();
    }
  }
  chartCanvas.style.display = 'block';

  // Create beautiful labels with time
  const labels = recentMoods.map(m => {
    try {
      const date = new Date(m.logged_at);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return 'Today';
      if (diffDays === 2) return 'Yesterday';
      if (diffDays <= 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  });
  
  const data = recentMoods.map(m => m.mood_value || 3);
  
  // Create gradient colors based on mood values
  const createGradient = (ctx, chartArea) => {
    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    gradient.addColorStop(0, 'rgba(102, 126, 234, 0.4)');
    gradient.addColorStop(0.5, 'rgba(118, 75, 162, 0.3)');
    gradient.addColorStop(1, 'rgba(240, 147, 251, 0.2)');
    return gradient;
  };

  // Get mood colors for points
  const getMoodColor = (moodValue) => {
    const colors = {
      1: '#f85032', // angry - red
      2: '#f7971e', // anxious - orange
      3: '#66a6ff', // sad - blue
      4: '#ece9e6', // neutral - gray
      5: '#4caf50'  // happy - green
    };
    return colors[moodValue] || '#667eea';
  };

  // Create gradient function for border (defined before use)
  function getGradient(ctx, chartArea) {
    if (!chartArea) return '#667eea';
    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(0.5, '#764ba2');
    gradient.addColorStop(1, '#f093fb');
    return gradient;
  }

  if (!moodChart) {
    try {
      const ctx = chartCanvas.getContext('2d');
      
      moodChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Mood Level',
            data: data,
            borderColor: function(ctx) {
              const chart = ctx.chart;
              const {ctx: chartCtx, chartArea} = chart;
              return getGradient(chartCtx, chartArea);
            },
            backgroundColor: function(ctx) {
              const chart = ctx.chart;
              const {ctx: chartCtx, chartArea} = chart;
              if (!chartArea) {
                return 'rgba(102, 126, 234, 0.2)';
              }
              return createGradient(chartCtx, chartArea);
            },
            borderWidth: 4,
            fill: true,
            tension: 0.5,
            pointBackgroundColor: data.map(v => getMoodColor(v)),
            pointBorderColor: '#ffffff',
            pointBorderWidth: 3,
            pointRadius: 8,
            pointHoverRadius: 12,
            pointHoverBorderWidth: 4,
            pointHoverBackgroundColor: data.map(v => getMoodColor(v)),
            pointHoverBorderColor: '#fff',
            cubicInterpolationMode: 'monotone'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 1500,
            easing: 'easeInOutQuart'
          },
          interaction: {
            intersect: false,
            mode: 'index'
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 12,
              titleFont: {
                size: 14,
                weight: 'bold'
              },
              bodyFont: {
                size: 13
              },
              borderColor: 'rgba(102, 126, 234, 0.5)',
              borderWidth: 2,
              cornerRadius: 8,
              displayColors: true,
              callbacks: {
                label: function(context) {
                  const moodLabels = {
                    1: '😡 Angry',
                    2: '😟 Anxious', 
                    3: '😔 Sad',
                    4: '😐 Neutral',
                    5: '😊 Happy'
                  };
                  return `Mood: ${moodLabels[context.parsed.y] || 'Unknown'}`;
                }
              }
            }
          },
          scales: {
            y: {
              min: 0.5,
              max: 5.5,
              ticks: {
                stepSize: 1,
                font: {
                  size: 12,
                  weight: '500'
                },
                color: '#666',
                callback: function (value) {
                  const moodLabels = {
                    1: '😡',
                    2: '😟', 
                    3: '😔',
                    4: '😐',
                    5: '😊'
                  };
                  return moodLabels[value] || '';
                }
              },
              grid: {
                color: 'rgba(0,0,0,0.08)',
                lineWidth: 1,
                drawBorder: false
              }
            },
            x: {
              ticks: {
                font: {
                  size: 11,
                  weight: '500'
                },
                color: '#666'
              },
              grid: {
                display: false,
                drawBorder: false
              }
            }
          },
          onResize: function(chart, size) {
            // Update gradients on resize
            const {ctx, chartArea} = chart;
            if (chartArea && chart.data.datasets[0]) {
              chart.data.datasets[0].backgroundColor = createGradient(ctx, chartArea);
              chart.data.datasets[0].borderColor = getGradient(ctx, chartArea);
            }
          }
        }
      });
      
      // Update gradients after chart is created
      setTimeout(() => {
        if (moodChart && moodChart.chartArea) {
          const {ctx, chartArea} = moodChart;
          if (chartArea) {
            moodChart.data.datasets[0].backgroundColor = createGradient(ctx, chartArea);
            moodChart.data.datasets[0].borderColor = getGradient(ctx, chartArea);
            moodChart.update('none');
          }
        }
      }, 100);
      
    } catch (error) {
      console.error('Error creating chart:', error);
    }
  } else {
    try {
      moodChart.data.labels = labels;
      moodChart.data.datasets[0].data = data;
      moodChart.data.datasets[0].pointBackgroundColor = data.map(v => getMoodColor(v));
      moodChart.data.datasets[0].pointHoverBackgroundColor = data.map(v => getMoodColor(v));
      
      // Update gradient
      const chart = moodChart;
      const {ctx, chartArea} = chart;
      if (chartArea) {
        moodChart.data.datasets[0].backgroundColor = createGradient(ctx, chartArea);
        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(0.5, '#764ba2');
        gradient.addColorStop(1, '#f093fb');
        moodChart.data.datasets[0].borderColor = gradient;
      }
      
      moodChart.update('active');
    } catch (error) {
      console.error('Error updating chart:', error);
    }
  }
}

// Storage key for moods (for offline backup)
const MOODS_STORAGE_KEY = 'mindcare_moods';

// Helper function to save moods to localStorage (backup)
function saveMoodsToStorage() {
  try {
    localStorage.setItem(MOODS_STORAGE_KEY, JSON.stringify(moods));
    console.log('✅ Moods saved to localStorage (backup)');
  } catch (err) {
    console.error('❌ Failed to save moods to localStorage:', err);
  }
}

// Helper function to load moods from localStorage (backup)
function loadMoodsFromStorage() {
  try {
    const stored = localStorage.getItem(MOODS_STORAGE_KEY);
    if (stored) {
      const parsedMoods = JSON.parse(stored);
      return Array.isArray(parsedMoods) ? parsedMoods : [];
    }
  } catch (err) {
    console.error('❌ Failed to load moods from localStorage:', err);
  }
  return [];
}

// Load moods from Supabase (via API) with localStorage fallback
async function loadMoods() {
  console.log('📊 Loading moods from Supabase...');
  
  const apiBaseUrl = getApiBaseUrl();
  const apiUrl = `${apiBaseUrl}/api/moods`;
  
  try {
    // Try to load from Supabase via API
    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      mode: 'cors'
    });
    
    if (res.ok) {
      const responseText = await res.text();
      if (responseText && responseText.trim() !== '') {
        const data = JSON.parse(responseText);
        if (data.success && Array.isArray(data.data)) {
          moods = data.data;
          
          // Save to localStorage as backup
          saveMoodsToStorage();
          
          // Sort moods by date (newest first)
          moods.sort((a, b) => {
            try {
              const dateA = new Date(a.logged_at);
              const dateB = new Date(b.logged_at);
              return dateB - dateA;
            } catch (e) {
              return 0;
            }
          });
          
          console.log('✅ Loaded', moods.length, 'moods from Supabase');
          
          // Remove offline notice if it exists
          const offlineNotice = document.querySelector('.offline-notice');
          if (offlineNotice) {
            offlineNotice.remove();
          }
          
          displayMoodHistory();
          updateChart();
          return;
        }
      }
    }
    
    // If API call failed, try localStorage
    throw new Error('API unavailable');
    
  } catch (err) {
    console.warn('⚠️ Could not load from Supabase, trying localStorage...', err.message);
    
    // Fallback to localStorage
    const storedMoods = loadMoodsFromStorage();
    if (storedMoods.length > 0) {
      moods = storedMoods;
      
      // Sort moods by date (newest first)
      moods.sort((a, b) => {
        try {
          const dateA = new Date(a.logged_at);
          const dateB = new Date(b.logged_at);
          return dateB - dateA;
        } catch (e) {
          return 0;
        }
      });
      
      console.log('✅ Loaded', moods.length, 'moods from localStorage (offline mode)');
      displayMoodHistory();
      updateChart();
      
      // Show a subtle notice that we're in offline mode
      if (moodHistory && !document.querySelector('.offline-notice')) {
        const notice = document.createElement('div');
        notice.className = 'offline-notice';
        notice.style.cssText = 'background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 0.5rem 1rem; margin-bottom: 1rem; font-size: 0.85rem; color: #856404;';
        notice.innerHTML = 'ℹ️ Showing offline data. Connect to server to sync with Supabase.';
        moodHistory.parentNode.insertBefore(notice, moodHistory);
      }
    } else {
      // No moods yet
      moods = [];
      displayMoodHistory();
      updateChart();
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

    const deleteBtn = entry.querySelector('.deleteBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (confirm('Delete this mood entry?')) {
          try {
            const apiBaseUrl = getApiBaseUrl();
            const apiUrl = `${apiBaseUrl}/api/moods/${m.id}`;
            let deletedFromSupabase = false;
            
            // Try to delete from Supabase (skip if it's a local entry)
            if (!m.id.toString().startsWith('local_')) {
              try {
                const res = await fetch(apiUrl, { 
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                  },
                  mode: 'cors'
                });
                
                if (res.ok) {
                  deletedFromSupabase = true;
                  console.log('✅ Mood deleted from Supabase');
                }
              } catch (apiError) {
                console.warn('⚠️ Could not delete from Supabase:', apiError.message);
              }
            }
            
            // Remove from array
            moods = moods.filter(item => item.id !== m.id);
            
            // Always update localStorage
            saveMoodsToStorage();
            
            // Update UI
            displayMoodHistory();
            updateChart();
            
            console.log('✅ Mood deleted successfully' + (deletedFromSupabase ? ' from Supabase' : ' (local)'));
          } catch (err) {
            console.error("❌ Failed to delete mood:", err);
            alert('Failed to delete mood entry: ' + (err.message || 'Please try again.'));
          }
        }
      });
    }
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

function setupMoodTracker() {
  if (!logMoodBtn || !moodSelect) {
    console.error('❌ Cannot setup mood tracker: elements not found');
    return;
  }

  logMoodBtn.addEventListener('click', async () => {
    const mood = moodSelect.value;
    if (!mood) {
      alert("Please select a mood first.");
      moodSelect.focus();
      return;
    }

    // Disable button during submission
    const originalText = logMoodBtn.textContent;
    logMoodBtn.disabled = true;
    logMoodBtn.textContent = 'Logging...';

    console.log('📝 Logging mood:', mood, 'with value:', moodValue(mood));

    try {
      const apiBaseUrl = getApiBaseUrl();
      const apiUrl = `${apiBaseUrl}/api/moods`;
      const requestBody = { 
        mood, 
        mood_value: moodValue(mood) 
      };
      
      // Try to save to Supabase via API
      let savedToSupabase = false;
      let newMoodEntry = null;
      
      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          mode: 'cors',
          body: JSON.stringify(requestBody)
        });
        
        if (res.ok) {
          const responseText = await res.text();
          if (responseText && responseText.trim() !== '') {
            const result = JSON.parse(responseText);
            if (result.success && result.id) {
              // Successfully saved to Supabase
              newMoodEntry = { 
                id: result.id, 
                mood, 
                mood_value: moodValue(mood), 
                logged_at: new Date().toISOString() 
              };
              savedToSupabase = true;
              console.log('✅ Mood saved to Supabase:', newMoodEntry);
            }
          }
        }
      } catch (apiError) {
        console.warn('⚠️ Could not save to Supabase, using localStorage:', apiError.message);
      }
      
      // If Supabase save failed, create entry with local ID
      if (!savedToSupabase) {
        newMoodEntry = { 
          id: 'local_' + Date.now().toString(36) + Math.random().toString(36).substr(2), 
          mood, 
          mood_value: moodValue(mood), 
          logged_at: new Date().toISOString() 
        };
        console.log('✅ Mood saved to localStorage (offline):', newMoodEntry);
      }
      
      // Add to the beginning of the array
      moods.unshift(newMoodEntry);
      
      // Always save to localStorage as backup
      saveMoodsToStorage();
      
      console.log('💾 Mood logged successfully:', newMoodEntry);
      console.log('📊 Total moods:', moods.length);
      
      // Update UI immediately
      displayMoodHistory();
      updateChart();
      updateBackground(mood);
      moodSelect.value = '';
      
      // Show success feedback
      logMoodBtn.textContent = savedToSupabase ? '✓ Saved!' : '✓ Saved (Offline)';
      logMoodBtn.style.background = savedToSupabase 
        ? 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)'
        : 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)';
      setTimeout(() => {
        logMoodBtn.textContent = originalText;
        logMoodBtn.style.background = '';
        logMoodBtn.disabled = false;
      }, 2000);
    } catch (err) {
      console.error("❌ Failed to log mood:", err);
      alert('Failed to log mood: ' + (err.message || 'Please try again.'));
      logMoodBtn.textContent = originalText;
      logMoodBtn.disabled = false;
    }
  });
  
  console.log('✅ Mood tracker event listeners attached');
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
  console.log('🚀 DOM loaded, initializing MindCare...');
  
  // Initialize mood tracker
  initMoodTracker();
  
  // Only load features if we're on the relevant pages
  if (document.getElementById('moodHistory')) {
    console.log('📊 Loading mood history...');
    loadMoods();
  }
  
  if (document.getElementById('journalList')) {
    console.log('📔 Loading journal entries...');
    loadJournalEntries();
  }
  
  console.log('✅ MindCare frontend initialized');
});

// Also try to initialize if DOM is already loaded (fallback for scripts loaded after DOM)
if (document.readyState !== 'loading') {
  console.log('✅ DOM already loaded when script executed');
  // Small delay to ensure all elements are available
  setTimeout(() => {
    if (!logMoodBtn || !moodSelect) {
      initMoodTracker();
    }
    if (document.getElementById('moodHistory') && moods.length === 0) {
      loadMoods();
    }
  }, 50);
}