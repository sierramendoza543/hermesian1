'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';

// TODO: Replace dummy threads/messages with Firebase Firestore queries
const dummyThreads = [
  { id: 't1', title: "Today's Digest – Bias Check", lastUpdated: '5 min ago' },
  { id: 't2', title: 'Fallacy Q&A', lastUpdated: '10 min ago' },
  { id: 't3', title: 'Emotional Appeals Discussion', lastUpdated: '15 min ago' },
  { id: 't4', title: 'Media Literacy Tips', lastUpdated: '20 min ago' },
];

const dummyMessages = [
  { id: 'm1', user: 'AB', text: 'I noticed a strong left bias in the coverage of the recent policy changes.', time: '2m ago' },
  { id: 'm2', user: 'CD', text: 'Can someone explain the fallacy used in the headline?', time: '1m ago' },
  { id: 'm3', user: 'EF', text: 'The article seems to be using an appeal to authority by quoting only one expert.', time: 'just now' },
];

export default function CommunityPage() {
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // TODO: Implement Firebase message sending
      console.log('Sending message:', newMessage);
      setNewMessage('');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 py-12 px-4 md:px-16">
        {/* Left Panel - Thread List */}
        <aside className="lg:w-1/4 bg-white rounded-2xl shadow-md p-4 overflow-y-auto max-h-[calc(100vh-200px)]">
          <h2 className="text-xl font-semibold mb-4">Discussions</h2>
          <button className="w-full mb-4 py-2 border-2 border-black text-black rounded-lg hover:bg-primary hover:text-black transition">
            + New Topic
          </button>
          <div className="space-y-2">
            {dummyThreads.map(thread => (
              <div
                key={thread.id}
                onClick={() => setSelectedThread(thread.id)}
                className={`p-3 mb-2 rounded-lg cursor-pointer transition ${
                  selectedThread === thread.id ? 'bg-primary' : 'hover:bg-accent'
                }`}
              >
                <h3 className="font-medium">{thread.title}</h3>
                <p className="text-sm text-gray-500">
                  {thread.lastUpdated}
                </p>
              </div>
            ))}
          </div>
        </aside>

        {/* Right Panel - Message Thread */}
        <section className="lg:w-3/4 bg-white rounded-2xl shadow-md flex flex-col p-6 max-h-[calc(100vh-200px)]">
          {!selectedThread ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Select a discussion to view messages
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {dummyMessages.map(msg => (
                  <div key={msg.id} className="flex items-start">
                    <div className="w-8 h-8 bg-secondary text-black rounded-full flex items-center justify-center mr-3">
                      {msg.user}
                    </div>
                    <div>
                      <p className="bg-accent p-3 rounded-lg">{msg.text}</p>
                      <p className="text-xs text-gray-400 mt-1">{msg.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-auto">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={2}
                  placeholder="Write a reply..."
                />
                <button
                  onClick={handleSendMessage}
                  className="mt-2 px-4 py-2 border-2 border-black text-black rounded-lg hover:bg-primary hover:text-black transition flex items-center gap-2"
                >
                  <Send size={16} />
                  Send
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
} 