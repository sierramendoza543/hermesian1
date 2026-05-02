'use client';

import { Edit } from 'lucide-react';

// TODO: Replace with Firebase Auth & Firestore data
const user = {
  name: 'Sierra Mendoza',
  streak: 7,
  badges: [
    { id: 'b1', title: 'Bias Buster', description: 'Identified 10+ biased statements' },
    { id: 'b2', title: 'Fallacy Finder', description: 'Spotted 5+ logical fallacies' },
    { id: 'b3', title: 'Emotion Expert', description: 'Analyzed 20+ emotional appeals' },
    { id: 'b4', title: 'Media Master', description: 'Completed all learning modules' },
  ],
  savedArticles: [
    { id: 'a1', title: 'The Impact of Social Media on News Consumption' },
    { id: 'a2', title: 'Understanding Political Bias in Mainstream Media' },
    { id: 'a3', title: 'How to Spot Logical Fallacies in News Articles' },
  ],
};

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 md:px-16">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left: User Info */}
          <section className="lg:w-1/3 bg-white rounded-2xl shadow-md p-6">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-primary text-black rounded-full flex items-center justify-center text-xl font-bold mb-4">
                {user.name.split(' ').map(n => n[0]).join('')}
              </div>
              <h1 className="text-2xl font-bold mb-4">{user.name}</h1>
              <button className="w-full py-2 border-2 border-black text-black rounded-lg hover:bg-primary hover:text-black transition flex items-center justify-center gap-2">
                <Edit size={16} />
                Edit Profile
              </button>
            </div>
          </section>

          {/* Right: Stats & History */}
          <section className="lg:w-2/3 space-y-8">
            {/* Streak Card */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Your Streak</h2>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🗓️</span>
                <span className="text-2xl font-bold">{user.streak}-day streak</span>
              </div>
            </div>

            {/* Badges Grid */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Your Badges</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.badges.map(badge => (
                  <div key={badge.id} className="bg-accent p-4 rounded-lg">
                    <h3 className="font-medium">{badge.title}</h3>
                    <p className="text-sm text-gray-600">{badge.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Saved Articles List */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Saved Articles</h2>
              <div className="space-y-4">
                {user.savedArticles.map(article => (
                  <div key={article.id} className="flex justify-between items-center p-4 bg-accent rounded-lg">
                    <h3 className="font-medium">{article.title}</h3>
                    <button className="px-4 py-2 border-2 border-black text-black rounded-lg hover:bg-primary hover:text-black transition">
                      Open
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
} 