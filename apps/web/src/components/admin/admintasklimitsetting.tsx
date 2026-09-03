import React, { useState, useEffect } from "react";

export function AdminTaskLimitSetting() {
  const [dailyLimit, setDailyLimit] = useState("5");
  const [cooldownHours, setCooldownHours] = useState("24");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Fetch existing settings if available in localStorage or backend
    const savedLimit = localStorage.getItem("admin_daily_limit");
    const savedCooldown = localStorage.getItem("admin_cooldown_hours");
    if (savedLimit) setDailyLimit(savedLimit);
    if (savedCooldown) setCooldownHours(savedCooldown);
  }, []);

  const handleSave = () => {
    setLoading(true);
    // Save to localStorage or your database logic
    localStorage.setItem("admin_daily_limit", dailyLimit);
    localStorage.setItem("admin_cooldown_hours", cooldownHours);
    
    setTimeout(() => {
      setLoading(false);
      setMessage("Settings saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    }, 500);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-2">Task Limit & Cooldown Settings</h3>
      <p className="text-sm text-gray-500 mb-4">Configure daily task limits and the cooldown period between tasks for users.</p>
      
      {message && (
        <div className="mb-4 p-2 bg-green-100 text-green-700 text-sm rounded">
          {message}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Daily Task Limit per User</label>
          <input
            type="number"
            value={dailyLimit}
            onChange={(e) => setDailyLimit(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            placeholder="e.g. 5"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Cooldown Time (Hours)</label>
          <input
            type="number"
            value={cooldownHours}
            onChange={(e) => setCooldownHours(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            placeholder="e.g. 24"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
