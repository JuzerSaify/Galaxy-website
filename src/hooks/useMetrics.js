import { useState, useEffect } from 'react';
import { supabase } from './useAuth';

export function useMetrics(user, page) {
  const [loading, setLoading] = useState(false);
  const [dbUsage, setDbUsage] = useState([]);
  const [metrics, setMetrics] = useState({
    stats: { queryCount: 0, totalTokens: 0 },
    weeklyTrend: [],
    modelRuns: [],
    recentQueries: []
  });

  useEffect(() => {
    if (user && page === 'dashboard') {
      fetchUserUsage();
    }
  }, [user, page]);

  const fetchUserUsage = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('model_usage')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setDbUsage(data);
        processDatabaseMetrics(data);
      } else {
        setDbUsage([]);
        setMetrics({
          stats: { queryCount: 0, totalTokens: 0 },
          weeklyTrend: [],
          modelRuns: [],
          recentQueries: []
        });
      }
    } catch (e) {
      console.warn('Failed to load profile database stats:', e.message);
      setMetrics({
        stats: { queryCount: 0, totalTokens: 0 },
        weeklyTrend: [],
        modelRuns: [],
        recentQueries: []
      });
    } finally {
      setLoading(false);
    }
  };

  const processDatabaseMetrics = (rows) => {
    const queryCount = rows.length;
    const totalTokens = rows.reduce((acc, r) => acc + (r.tokens_estimated || 0), 0);

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const trendMap = {};
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = daysOfWeek[d.getDay()] + (i === 0 ? ': Today' : '');
      const key = d.toDateString();
      trendMap[key] = { label, tokens: 0 };
    }

    rows.forEach(r => {
      const dateKey = new Date(r.created_at).toDateString();
      if (trendMap[dateKey]) {
        trendMap[dateKey].tokens += (r.tokens_estimated || 0);
      }
    });

    const weeklyTrend = Object.keys(trendMap).map(k => ({
      day: trendMap[k].label,
      tokens: trendMap[k].tokens
    }));

    const modelMap = {};
    rows.forEach(r => {
      const model = r.selected_model || 'unknown';
      modelMap[model] = (modelMap[model] || 0) + 1;
    });

    const modelRuns = Object.keys(modelMap).map(model => ({
      model,
      count: modelMap[model]
    })).sort((a, b) => b.count - a.count);

    const recentQueries = rows.slice(0, 5);

    setMetrics({
      stats: { queryCount, totalTokens },
      weeklyTrend,
      modelRuns,
      recentQueries
    });
  };

  return {
    loading,
    dbUsage,
    metrics,
    refresh: fetchUserUsage
  };
}
