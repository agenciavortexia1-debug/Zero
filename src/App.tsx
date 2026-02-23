import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  CheckCircle2, 
  History, 
  TrendingUp, 
  AlertCircle, 
  Wallet, 
  Cigarette,
  Loader2,
  BrainCircuit,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Flame,
  MessageSquare,
  Calendar,
  Clock,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, eachDayOfInterval, isSameDay, addMonths, subMonths, isSameMonth, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface Pack {
  id: number;
  start_time: string;
  end_time: string | null;
  price: number;
  status: 'active' | 'finished';
  unit_count: number;
}

interface Stats {
  totalSpent: number;
  totalPacks: number;
  totalUnits: number;
  avgPacksPerDay: string;
  avgSpentPerDay: string;
  avgPacksPerWeek: string;
  avgSpentPerWeek: string;
  avgPacksPerMonth: string;
  avgSpentPerMonth: string;
  periodDays: number;
  timeline: { date: string; count: number }[];
}

export default function App() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [price, setPrice] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analysis' | 'coach'>('dashboard');
  const [registeringUnit, setRegisteringUnit] = useState(false);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Trigger Analysis State
  const [triggerAnalysis, setTriggerAnalysis] = useState<{triggers: any[], encouragement: string} | null>(null);
  const [analyzingTriggers, setAnalyzingTriggers] = useState(false);
  
  // Date Range Filter State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filterStart, setFilterStart] = useState<Date>(startOfMonth(new Date()));
  const [filterEnd, setFilterEnd] = useState<Date>(endOfMonth(new Date()));
  const [tempStart, setTempStart] = useState<Date>(startOfMonth(new Date()));
  const [tempEnd, setTempEnd] = useState<Date>(endOfMonth(new Date()));
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const fetchData = async (start?: Date, end?: Date) => {
    try {
      let statsUrl = '/api/stats';
      if (start && end) {
        statsUrl += `?start=${start.toISOString()}&end=${end.toISOString()}`;
      }
      
      const [packsRes, statsRes] = await Promise.all([
        fetch('/api/packs'),
        fetch(statsUrl)
      ]);
      const packsData = await packsRes.json();
      const statsData = await statsRes.json();
      setPacks(packsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApplyFilter = () => {
    setFilterStart(tempStart);
    setFilterEnd(tempEnd);
    fetchData(tempStart, tempEnd);
    setShowDatePicker(false);
  };

  const handleNewPack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!price) return;

    try {
      const res = await fetch('/api/packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: parseFloat(price) })
      });
      if (res.ok) {
        setPrice('');
        fetchData();
      }
    } catch (error) {
      console.error('Error creating pack:', error);
    }
  };

  const handleConsumeUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePack) return;
    setRegisteringUnit(true);

    try {
      const res = await fetch('/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack_id: activePack.id, reason })
      });
      if (res.ok) {
        setReason('');
        fetchData();
      }
    } catch (error) {
      console.error('Error consuming unit:', error);
    } finally {
      setRegisteringUnit(false);
    }
  };

  const generateAiAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/ai-analysis', { method: 'POST' });
      const data = await res.json();
      setAiAnalysis(data.analysis);
    } catch (error) {
      console.error('Error generating analysis:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const generateTriggerAnalysis = async () => {
    setAnalyzingTriggers(true);
    try {
      const res = await fetch('/api/trigger-analysis', { method: 'POST' });
      const data = await res.json();
      setTriggerAnalysis(data);
    } catch (error) {
      console.error('Error generating trigger analysis:', error);
    } finally {
      setAnalyzingTriggers(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { role: 'user' as const, text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chatInput, history: chatMessages })
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'ai', text: data.response }]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const CoachView = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-[calc(100vh-250px)]"
    >
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 scrollbar-hide">
        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 px-8">
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">Seu Coach Anti-Tabagismo</h3>
              <p className="text-xs text-zinc-500 mt-1">Estou aqui para te ajudar a lidar com a fissura e manter o foco no seu objetivo.</p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
              <button 
                onClick={() => setChatInput("Estou com muita vontade de fumar agora, o que eu faço?")}
                className="text-[10px] bg-white border border-zinc-200 rounded-xl p-3 text-zinc-600 hover:border-zinc-900 transition-colors"
              >
                "Estou com muita vontade de fumar agora..."
              </button>
              <button 
                onClick={() => setChatInput("Quais os benefícios de parar hoje?")}
                className="text-[10px] bg-white border border-zinc-200 rounded-xl p-3 text-zinc-600 hover:border-zinc-900 transition-colors"
              >
                "Quais os benefícios de parar hoje?"
              </button>
            </div>
          </div>
        )}
        
        {chatMessages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 text-sm ${
              msg.role === 'user' 
                ? 'bg-zinc-900 text-white rounded-tr-none' 
                : 'bg-white border border-zinc-200 text-zinc-900 rounded-tl-none shadow-sm'
            }`}>
              <Markdown>{msg.text}</Markdown>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-zinc-100 rounded-2xl p-4 rounded-tl-none">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="mt-4 relative">
        <input 
          type="text" 
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Fale com seu coach..."
          className="w-full bg-white border border-zinc-200 rounded-2xl pl-4 pr-12 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 shadow-lg"
        />
        <button 
          type="submit"
          className="absolute right-2 top-2 bottom-2 w-10 bg-zinc-900 text-white rounded-xl flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="w-5 h-5 rotate-45" />
        </button>
      </form>
    </motion.div>
  );

  const activePack = packs.find(p => p.status === 'active');

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans pb-24">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <Cigarette className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">FumoZero</h1>
          </div>
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <History className="w-5 h-5 text-zinc-600" />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 py-8">
        {activeTab === 'dashboard' ? (
          <div className="space-y-8">
            {/* Active Pack Section */}
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Status Atual
              </h2>
              
              {activePack ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm text-zinc-500">Carteira em uso</p>
                      <p className="text-2xl font-bold">R$ {activePack.price.toFixed(2)}</p>
                    </div>
                    <div className="bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase px-2 py-1 rounded-md">
                      Ativa
                    </div>
                  </div>

                  {/* Unit Progress */}
                  <div className="mb-6">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-xs font-bold text-zinc-400 uppercase">Consumo da Carteira</span>
                      <span className="text-sm font-bold text-zinc-900">{activePack.unit_count} / 20</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(activePack.unit_count / 20) * 100}%` }}
                        className="h-full bg-zinc-900"
                      />
                    </div>
                  </div>

                  {/* Consume Unit Form */}
                  <form onSubmit={handleConsumeUnit} className="space-y-3">
                    <div className="relative">
                      <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input 
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Motivo do consumo (opcional)"
                        className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={registeringUnit}
                      className="w-full bg-zinc-900 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors active:scale-95 disabled:opacity-50"
                    >
                      {registeringUnit ? <Loader2 className="w-5 h-5 animate-spin" /> : <Flame className="w-5 h-5" />}
                      Registrar Consumo
                    </button>
                  </form>
                </motion.div>
              ) : (
                <motion.form 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={handleNewPack}
                  className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4"
                >
                  <p className="text-sm text-zinc-500">Nenhuma carteira ativa. Comece uma nova:</p>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="Valor da carteira"
                      className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-zinc-900 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors active:scale-95"
                  >
                    <Plus className="w-5 h-5" /> Iniciar Nova Carteira
                  </button>
                </motion.form>
              )}
            </section>

            {/* Quick Stats */}
            <section className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 text-zinc-500 mb-1">
                  <Wallet className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Total Gasto</span>
                </div>
                <p className="text-xl font-bold">R$ {stats?.totalSpent.toFixed(2)}</p>
              </div>
              <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 text-zinc-500 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Média Diária</span>
                </div>
                <p className="text-xl font-bold">R$ {stats?.avgSpentPerDay}</p>
              </div>
            </section>

            {/* AI Analysis Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4" /> Análise de Saúde IA
                </h2>
                <button 
                  onClick={generateAiAnalysis}
                  disabled={analyzing || packs.length === 0}
                  className="text-xs font-bold text-zinc-900 flex items-center gap-1 disabled:opacity-50"
                >
                  {analyzing ? 'Analisando...' : 'Atualizar'} <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="bg-zinc-900 text-zinc-100 rounded-2xl p-6 shadow-xl min-h-[100px] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <BrainCircuit className="w-12 h-12" />
                </div>
                
                {analyzing ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-4">
                    <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                    <p className="text-xs text-zinc-400 animate-pulse">Processando dados de consumo...</p>
                  </div>
                ) : aiAnalysis ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <Markdown>{aiAnalysis}</Markdown>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
                    <p className="text-sm text-zinc-400">
                      {packs.length === 0 
                        ? "Comece a rastrear para ver sua análise de saúde." 
                        : "Clique em atualizar para gerar sua análise personalizada."}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* Date Range Filter */}
            <section className="relative">
              <div 
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-zinc-300 transition-colors shadow-sm"
              >
                <div className="flex items-center gap-3 text-zinc-900">
                  <Calendar className="w-5 h-5 text-zinc-500" />
                  <span className="text-sm font-mono tracking-tight">
                    {format(filterStart, "dd/MM/yyyy")} — {format(filterEnd, "dd/MM/yyyy")}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
              </div>

              <AnimatePresence>
                {showDatePicker && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-2xl shadow-2xl z-20 overflow-hidden"
                  >
                    {/* Calendar Header */}
                    <div className="p-4 flex items-center justify-between border-b border-zinc-100">
                      <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-500">
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-xs font-bold uppercase tracking-widest text-zinc-900">
                        {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                      </span>
                      <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-500">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="p-4">
                      <div className="grid grid-cols-7 mb-2">
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                          <div key={`${d}-${i}`} className="text-[10px] font-bold text-zinc-400 text-center py-2">{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {Array(startOfMonth(currentMonth).getDay()).fill(null).map((_, i) => <div key={`blank-${i}`} />)}
                        {eachDayOfInterval({
                          start: startOfMonth(currentMonth),
                          end: endOfMonth(currentMonth)
                        }).map(day => {
                          const isSelected = isSameDay(day, tempStart) || isSameDay(day, tempEnd);
                          const isInRange = day > tempStart && day < tempEnd;
                          
                          return (
                            <button
                              key={day.toISOString()}
                              onClick={() => {
                                if (isSameDay(day, tempStart)) return;
                                if (day < tempStart) {
                                  setTempStart(startOfDay(day));
                                } else {
                                  setTempEnd(endOfDay(day));
                                }
                              }}
                              className={`
                                aspect-square rounded-lg text-xs font-medium transition-all flex items-center justify-center
                                ${isSelected ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-900/20' : ''}
                                ${isInRange ? 'bg-zinc-100 text-zinc-900' : ''}
                                ${!isSelected && !isInRange ? 'text-zinc-600 hover:bg-zinc-100' : ''}
                              `}
                            >
                              {format(day, 'd')}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Apply Button */}
                    <div className="p-4 border-t border-zinc-100">
                      <button 
                        onClick={handleApplyFilter}
                        className="w-full bg-zinc-900 hover:bg-zinc-800 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                      >
                        <Check className="w-4 h-4" /> Aplicar Período
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Temporal Chart */}
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Tendência de Consumo
              </h2>
              <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.timeline}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#18181b" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#18181b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#a1a1aa' }}
                      tickFormatter={(val) => format(new Date(val), 'dd/MM')}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#a1a1aa' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        borderRadius: '12px', 
                        border: '1px solid #f4f4f5',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                      labelFormatter={(val) => format(new Date(val), 'dd/MM/yyyy')}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#18181b" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorCount)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Indicadores de Consumo
              </h2>
              
              <div className="grid grid-cols-1 gap-4">
                {/* Total Stats */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-600">
                        <Cigarette className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Total Consumido</p>
                        <p className="text-2xl font-bold">{stats?.totalUnits} cigarros</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-400 font-bold uppercase">Carteiras</p>
                      <p className="text-lg font-bold text-zinc-600">{stats?.totalPacks}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div className="text-center">
                      <p className="text-[10px] text-zinc-400 font-bold uppercase mb-1">Dia</p>
                      <p className="text-sm font-bold">{(parseFloat(stats?.avgPacksPerDay || '0') * 20).toFixed(1)}</p>
                    </div>
                    <div className="text-center border-x border-zinc-100">
                      <p className="text-[10px] text-zinc-400 font-bold uppercase mb-1">Semana</p>
                      <p className="text-sm font-bold">{(parseFloat(stats?.avgPacksPerWeek || '0') * 20).toFixed(1)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-zinc-400 font-bold uppercase mb-1">Mês</p>
                      <p className="text-sm font-bold">{(parseFloat(stats?.avgPacksPerMonth || '0') * 20).toFixed(1)}</p>
                    </div>
                  </div>
                </div>

                {/* Financial Stats */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
                    <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-600">
                      <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Custo Total</p>
                      <p className="text-2xl font-bold text-zinc-900">R$ {stats?.totalSpent.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-500">Média por Dia</span>
                      <span className="font-bold">R$ {stats?.avgSpentPerDay}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-500">Média por Semana</span>
                      <span className="font-bold">R$ {stats?.avgSpentPerWeek}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-500">Média por Mês</span>
                      <span className="font-bold">R$ {stats?.avgSpentPerMonth}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-center">
              <p className="text-xs text-zinc-500">
                Dados baseados em um período de <span className="font-bold text-zinc-900">{stats?.periodDays} dias</span> de uso.
              </p>
            </section>

            {/* Trigger Analysis Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Análise de Gatilhos
                </h2>
                <button 
                  onClick={generateTriggerAnalysis}
                  disabled={analyzingTriggers}
                  className="text-xs font-bold text-zinc-900 flex items-center gap-1 disabled:opacity-50"
                >
                  {analyzingTriggers ? 'Analisando...' : 'Analisar Gatilhos'} <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {triggerAnalysis ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    {triggerAnalysis.triggers.map((t, i) => (
                      <div key={i} className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-indigo-500" />
                          <h3 className="text-sm font-bold text-zinc-900">{t.name}</h3>
                        </div>
                        <p className="text-xs text-zinc-500 mb-3">{t.reason}</p>
                        <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                          <p className="text-[10px] font-bold text-indigo-700 uppercase mb-1">Sugestão Alternativa</p>
                          <p className="text-xs text-indigo-900">{t.suggestion}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-zinc-900 text-white rounded-2xl p-4 text-center">
                    <p className="text-xs italic">"{triggerAnalysis.encouragement}"</p>
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-100 border border-dashed border-zinc-300 rounded-2xl p-8 text-center">
                  <p className="text-xs text-zinc-500">
                    Analise seus motivos de consumo para identificar padrões emocionais e situacionais.
                  </p>
                </div>
              )}
            </section>
          </motion.div>
        )}
      </main>

      {/* Bottom Navigation (Mobile Feel) */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-md border-t border-zinc-200 px-4 py-4 flex justify-around items-center z-10">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'dashboard' ? 'text-zinc-900' : 'text-zinc-400'}`}
        >
          <Cigarette className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Início</span>
        </button>
        <button 
          onClick={() => setActiveTab('analysis')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'analysis' ? 'text-zinc-900' : 'text-zinc-400'}`}
        >
          <TrendingUp className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Análise</span>
        </button>
        <button 
          onClick={() => setActiveTab('coach')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'coach' ? 'text-zinc-900' : 'text-zinc-400'}`}
        >
          <BrainCircuit className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Coach</span>
        </button>
        <button 
          onClick={() => setShowHistory(true)}
          className="flex flex-col items-center gap-1 text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          <History className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Histórico</span>
        </button>
      </nav>

      {/* History Modal/Sheet Overlay */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 bg-white rounded-t-[32px] z-30 max-h-[80vh] overflow-y-auto shadow-2xl"
            >
              <div className="p-6">
                <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto mb-6" />
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Histórico</h3>
                  <span className="text-xs font-medium text-zinc-500">{packs.length} carteiras</span>
                </div>
                
                <div className="space-y-4">
                  {packs.map((pack) => (
                    <div key={pack.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pack.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-200 text-zinc-500'}`}>
                          <Cigarette className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">R$ {pack.price.toFixed(2)}</p>
                          <p className="text-[10px] text-zinc-500">
                            {format(new Date(pack.start_time), "dd/MM/yy HH:mm")} • {pack.unit_count} un.
                          </p>
                        </div>
                      </div>
                      <div className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${pack.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                        {pack.status === 'active' ? 'Em uso' : 'Finalizada'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
