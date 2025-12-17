# 🎨 Frontend Implementation Requirements - Human Handoff Feature

## 📋 Overview
Implement UI components and logic for the **Human Handoff** feature, allowing customers to request human support and enabling admins to manage conversations in real-time.

---

## 🎯 Required Features

### **1. Customer Chat Interface (Chatbot UI)**

#### **1.1 Request Human Support Button**
**Location:** Inside chat interface (bottom toolbar or message area)

**UI Component:**
```jsx
<button 
  onClick={handleRequestHuman}
  disabled={session.status !== 'bot'}
  className="request-human-btn"
>
  🙋 Talk to Human Agent
</button>
```

**States:**
- **Enabled** when `session.status === 'bot'` (normal bot conversation)
- **Disabled** when `session.status === 'human_pending'` or `'human_active'`
- Show tooltip: "Already connected to human agent" when disabled

**API Call:**
```typescript
POST /api/v1/chat/handoff
Body: {
  session_id: number,
  reason?: string  // Optional: "need_help_with_order", "technical_issue", etc.
}

Response: {
  success: true,
  message: "Handoff request created",
  session: {
    id: number,
    status: "human_pending",
    handoff_requested_at: string,
    working_hours: boolean
  }
}
```

---

#### **1.2 Status Indicator**
**Visual Feedback for Conversation Mode:**

```jsx
{session.status === 'bot' && (
  <div className="status-indicator bot-mode">
    <span className="dot bot"></span>
    <span>Chatting with Bot</span>
  </div>
)}

{session.status === 'human_pending' && (
  <div className="status-indicator pending-mode">
    <span className="dot pending"></span>
    <span>Waiting for agent...</span>
    <span className="subtext">Our agents are available 8AM-8PM</span>
  </div>
)}

{session.status === 'human_active' && (
  <div className="status-indicator human-mode">
    <span className="dot human"></span>
    <span>Connected to Agent</span>
  </div>
)}
```

**CSS Styling:**
```css
.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot.bot { background: #3b82f6; } /* Blue */
.dot.pending { 
  background: #f59e0b; /* Orange */
  animation: pulse 1.5s infinite;
}
.dot.human { background: #10b981; } /* Green */

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

---

#### **1.3 Message Sender Display**
**Differentiate Bot vs Admin Messages:**

```jsx
{messages.map(msg => (
  <div key={msg.id} className={`message ${msg.sender}`}>
    {msg.sender === 'bot' && (
      <div className="sender-info">
        <span className="avatar">🤖</span>
        <span className="name">AI Assistant</span>
      </div>
    )}
    
    {msg.sender === 'admin' && (
      <div className="sender-info">
        <span className="avatar">👤</span>
        <span className="name">Support Agent</span>
      </div>
    )}
    
    <div className="message-content">{msg.message}</div>
  </div>
))}
```

---

#### **1.4 Disable Bot Input During Handoff**
**Logic:**
```typescript
const isInputDisabled = session.status === 'human_pending';

// Show placeholder text
const placeholderText = isInputDisabled
  ? "Waiting for agent to respond..."
  : "Type your message...";
```

---

### **2. Admin Dashboard (New Interface)**

#### **2.1 Pending Conversations Panel**
**URL:** `/admin/conversations/pending`

**API Integration:**
```typescript
GET /api/v1/chat/conversations/pending

Response: {
  total: number,
  conversations: [
    {
      session_id: number,
      customer: {
        id: number,
        name: string,
        email: string
      } | null,
      visitor_id: string,
      handoff_reason: string,
      handoff_requested_at: string,
      created_at: string
    }
  ]
}
```

**UI Component:**
```jsx
<div className="pending-conversations">
  <h2>Pending Requests ({pendingCount})</h2>
  
  {conversations.map(conv => (
    <div key={conv.session_id} className="conversation-card">
      <div className="customer-info">
        <strong>
          {conv.customer?.name || `Guest ${conv.visitor_id}`}
        </strong>
        {conv.customer?.email && <span>{conv.customer.email}</span>}
      </div>
      
      <div className="metadata">
        <span className="reason">{conv.handoff_reason}</span>
        <span className="time">
          {formatRelativeTime(conv.handoff_requested_at)}
        </span>
      </div>
      
      <button onClick={() => handleAcceptConversation(conv.session_id)}>
        Accept Conversation
      </button>
    </div>
  ))}
</div>
```

**Accept Conversation API:**
```typescript
POST /api/v1/chat/conversations/:sessionId/accept?admin_id={adminId}

Response: {
  success: true,
  message: "Conversation accepted",
  session: {
    id: number,
    status: "human_active",
    assigned_admin_id: number,
    handoff_accepted_at: string
  }
}
```

---

#### **2.2 Active Conversations Panel**
**URL:** `/admin/conversations/active`

**API Integration:**
```typescript
GET /api/v1/chat/conversations/admin/:adminId

Response: {
  total: number,
  conversations: [
    {
      session_id: number,
      customer: { id, name, email } | null,
      visitor_id: string,
      handoff_reason: string,
      handoff_accepted_at: string,
      updated_at: string
    }
  ]
}
```

**UI Component:**
```jsx
<div className="active-conversations">
  <h2>My Active Conversations ({activeCount})</h2>
  
  {conversations.map(conv => (
    <div 
      key={conv.session_id} 
      className="conversation-card active"
      onClick={() => openConversation(conv.session_id)}
    >
      <div className="customer-info">
        <strong>
          {conv.customer?.name || `Guest ${conv.visitor_id}`}
        </strong>
        <span className="last-message">
          Last activity: {formatRelativeTime(conv.updated_at)}
        </span>
      </div>
      
      <div className="actions">
        <button onClick={() => handleCloseConversation(conv.session_id)}>
          Close Conversation
        </button>
      </div>
    </div>
  ))}
</div>
```

**Close Conversation API:**
```typescript
POST /api/v1/chat/conversations/:sessionId/close?admin_id={adminId}

Response: {
  success: true,
  message: "Conversation closed",
  session_id: number
}
```

---

#### **2.3 Admin Chat Interface**
**Real-time Chat Window for Admin:**

```jsx
<div className="admin-chat-window">
  <div className="chat-header">
    <div className="customer-info">
      <span>{customerName}</span>
      <span className="session-id">Session #{sessionId}</span>
    </div>
    <button onClick={handleClose}>Close Conversation</button>
  </div>
  
  <div className="messages-container">
    {messages.map(msg => (
      <div key={msg.id} className={`message ${msg.sender}`}>
        <div className="sender">
          {msg.sender === 'customer' ? '👤 Customer' : '🛠️ You'}
        </div>
        <div className="content">{msg.message}</div>
        <div className="timestamp">{formatTime(msg.created_at)}</div>
      </div>
    ))}
  </div>
  
  <div className="input-area">
    <textarea 
      value={adminMessage}
      onChange={(e) => setAdminMessage(e.target.value)}
      placeholder="Type your reply..."
      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
    />
    <button onClick={sendMessage}>Send</button>
  </div>
</div>
```

**Send Admin Message API:**
```typescript
POST /api/v1/chat/conversations/:sessionId/admin-message?admin_id={adminId}
Body: {
  message: string
}

Response: {
  success: true,
  message: {
    id: number,
    session_id: number,
    sender: "admin",
    message: string,
    created_at: string
  }
}
```

---

### **3. Notification System**

#### **3.1 Admin Dashboard - Polling (Initial Implementation)**
**Poll for new handoff requests every 30 seconds:**

```typescript
useEffect(() => {
  const pollPendingConversations = async () => {
    const response = await fetch('/api/v1/chat/conversations/pending');
    const data = await response.json();
    
    // Show browser notification if new requests
    if (data.total > previousCount) {
      showNotification('New customer waiting for support!');
    }
    
    setPendingConversations(data.conversations);
  };
  
  // Poll every 30s
  const interval = setInterval(pollPendingConversations, 30000);
  pollPendingConversations(); // Initial load
  
  return () => clearInterval(interval);
}, []);
```

**Browser Notification:**
```typescript
function showNotification(message: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Customer Support', {
      body: message,
      icon: '/logo.png',
      badge: '/badge.png',
    });
  }
}
```

---

#### **3.2 Customer Chat - Message Polling**
**Poll for new admin messages when in human mode:**

```typescript
useEffect(() => {
  if (session.status === 'human_active' || session.status === 'human_pending') {
    const pollMessages = async () => {
      const response = await fetch(`/api/v1/chat/history?session_id=${sessionId}`);
      const data = await response.json();
      setMessages(data.messages);
    };
    
    const interval = setInterval(pollMessages, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }
}, [session.status]);
```

---

### **4. State Management**

**Session State Interface:**
```typescript
interface ChatSession {
  id: number;
  customer_id: number | null;
  visitor_id: string | null;
  status: 'bot' | 'human_pending' | 'human_active' | 'closed';
  assigned_admin_id: number | null;
  handoff_requested_at: string | null;
  handoff_accepted_at: string | null;
  handoff_reason: string | null;
  created_at: string;
  updated_at: string;
}
```

**React State Example:**
```typescript
const [session, setSession] = useState<ChatSession | null>(null);
const [isHumanMode, setIsHumanMode] = useState(false);

useEffect(() => {
  setIsHumanMode(
    session?.status === 'human_pending' || session?.status === 'human_active'
  );
}, [session?.status]);
```

---

## 🎨 UI/UX Best Practices

### **Visual Design:**
1. **Status Colors:**
   - Bot mode: Blue (`#3b82f6`)
   - Pending: Orange/Yellow (`#f59e0b`)
   - Human active: Green (`#10b981`)
   - Closed: Gray (`#6b7280`)

2. **Smooth Transitions:**
   - Fade-in animation when status changes
   - Loading spinner during handoff request
   - Pulse animation for pending status

3. **Accessibility:**
   - ARIA labels for status indicators
   - Keyboard navigation support
   - Screen reader announcements for status changes

### **User Feedback:**
- Toast notifications when requesting human support
- Visual confirmation when admin joins conversation
- Clear messaging about working hours (8AM-8PM)

---

## 📱 Mobile Responsive

**Mobile-Specific Considerations:**
```css
@media (max-width: 768px) {
  .status-indicator {
    font-size: 12px;
    padding: 6px 10px;
  }
  
  .conversation-card {
    padding: 12px;
  }
  
  .admin-chat-window {
    height: 100vh;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
  }
}
```

---

## 🧪 Testing Checklist

### **Customer Flow:**
- [ ] Request human support button works
- [ ] Status changes from `bot` → `human_pending`
- [ ] Input disabled during `human_pending`
- [ ] Messages from admin display correctly
- [ ] Conversation closes properly

### **Admin Flow:**
- [ ] Pending list shows new requests
- [ ] Accept conversation works
- [ ] Chat interface loads conversation history
- [ ] Send message to customer works
- [ ] Close conversation updates status

### **Edge Cases:**
- [ ] Handle request outside working hours
- [ ] Multiple admins accepting same conversation
- [ ] Network errors during handoff
- [ ] Session expires during human conversation

---

## 🚀 Implementation Priority

**Phase 1 (MVP):**
1. Customer: Request human button
2. Customer: Status indicator
3. Admin: Pending conversations list
4. Admin: Accept conversation
5. Admin: Chat interface

**Phase 2 (Enhancement):**
1. Browser notifications
2. Real-time WebSocket (upgrade from polling)
3. Admin conversation history
4. Analytics dashboard

---

## 📚 API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chat/handoff` | POST | Customer requests human |
| `/chat/conversations/pending` | GET | List pending handoffs |
| `/chat/conversations/:id/accept` | POST | Admin accepts conversation |
| `/chat/conversations/:id/close` | POST | Admin closes conversation |
| `/chat/conversations/admin/:adminId` | GET | Admin's active conversations |
| `/chat/conversations/:id/admin-message` | POST | Admin sends message |
| `/chat/history?session_id=X` | GET | Get chat messages |

---

**✅ Backend đã sẵn sàng. Implement frontend theo tài liệu này!**
