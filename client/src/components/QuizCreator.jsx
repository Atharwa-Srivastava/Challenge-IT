import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle2, Clock, Award, ArrowLeft, Save, Sparkles, Download, Upload } from 'lucide-react';
import { KAHOOT_COLORS } from '../constants';
import { getHostAuthHeader, getStoredHostAuth } from '../utils/auth';

const DEFAULT_QUESTION = {
  question: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  timeLimit: 20,
  points: 1000,
  explanation: ''
};

export default function QuizCreator({ onBack, onSaveAndHost }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('⚡');
  const [questions, setQuestions] = useState([
    {
      question: 'What is the capital of France?',
      options: ['London', 'Paris', 'Berlin', 'Madrid'],
      correctIndex: 1,
      timeLimit: 20,
      points: 1000,
      explanation: 'Paris has been the capital of France since 987 AD.'
    },
    {
      question: 'Which planet is known as the Red Planet?',
      options: ['Venus', 'Mars', 'Jupiter', 'Mercury'],
      correctIndex: 1,
      timeLimit: 15,
      points: 1000,
      explanation: 'Mars appears red due to iron oxide (rust) on its surface.'
    }
  ]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const currentQ = questions[activeQuestionIndex];

  const handleAddQuestion = () => {
    const newQ = { ...DEFAULT_QUESTION, options: ['', '', '', ''] };
    setQuestions([...questions, newQ]);
    setActiveQuestionIndex(questions.length);
  };

  const handleRemoveQuestion = (idx, e) => {
    e.stopPropagation();
    if (questions.length <= 1) {
      setErrorMsg('A quiz must have at least 1 question.');
      return;
    }
    const updated = questions.filter((_, i) => i !== idx);
    setQuestions(updated);
    setActiveQuestionIndex(Math.max(0, idx - 1));
  };

  const handleUpdateQuestion = (field, value) => {
    const updated = [...questions];
    updated[activeQuestionIndex] = { ...updated[activeQuestionIndex], [field]: value };
    setQuestions(updated);
  };

  const handleUpdateOption = (optIdx, val) => {
    const updated = [...questions];
    const newOpts = [...updated[activeQuestionIndex].options];
    newOpts[optIdx] = val;
    updated[activeQuestionIndex].options = newOpts;
    setQuestions(updated);
  };

  const validateQuiz = () => {
    if (!title.trim()) {
      setErrorMsg('Please enter a quiz title.');
      return false;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        setErrorMsg(`Question #${i + 1} is missing a question prompt.`);
        setActiveQuestionIndex(i);
        return false;
      }
      for (let j = 0; j < 4; j++) {
        if (!q.options[j] || !q.options[j].trim()) {
          setErrorMsg(`Question #${i + 1} has an empty option ${j + 1}.`);
          setActiveQuestionIndex(i);
          return false;
        }
      }
    }
    setErrorMsg('');
    return true;
  };

  const handleSaveQuiz = async (shouldHost = false) => {
    if (!validateQuiz()) return;
    setIsSaving(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-host-auth': getHostAuthHeader()
        },
        body: JSON.stringify({
          title,
          description,
          coverImage,
          questions,
          auth: getStoredHostAuth()
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to save quiz on server.');
      }

      const savedQuiz = await response.json();

      // Back up to localStorage so custom quizzes persist permanently
      try {
        const stored = JSON.parse(localStorage.getItem('kahoot_custom_quizzes') || '[]');
        const updated = [...stored.filter(q => q.id !== savedQuiz.id), savedQuiz];
        localStorage.setItem('kahoot_custom_quizzes', JSON.stringify(updated));
      } catch (e) {
        console.error('LocalStorage backup error:', e);
      }

      if (shouldHost && onSaveAndHost) {
        onSaveAndHost(savedQuiz);
      } else {
        alert('Quiz created successfully!');
        onBack();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error saving quiz.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportJSON = () => {
    const data = JSON.stringify({ title, description, coverImage, questions }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '-') || 'quiz'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.coverImage) setCoverImage(parsed.coverImage);
        if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          setQuestions(parsed.questions);
          setActiveQuestionIndex(0);
        }
      } catch (err) {
        setErrorMsg('Invalid JSON quiz format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 hover:text-white border border-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
              Quiz Studio
            </h1>
            <p className="text-neutral-400 text-xs font-normal">Create and customize questions, timers, and point values.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 text-xs font-medium cursor-pointer border border-white/10 transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>Import</span>
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 text-xs font-medium border border-white/10 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          <button
            onClick={() => handleSaveQuiz(false)}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-white font-medium text-xs transition-all border border-white/10"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Quiz</span>
          </button>

          <button
            onClick={() => handleSaveQuiz(true)}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-5 py-1.5 rounded-full bg-white text-black hover:bg-neutral-200 font-semibold text-xs shadow-sm transition-all active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Save &amp; Host Game</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mt-4 p-3 bg-red-950/70 border border-red-500/50 rounded-xl text-red-300 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
        {/* Sidebar Questions List */}
        <div className="lg:col-span-1 bg-[#101012] border border-white/[0.08] rounded-3xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
              Questions ({questions.length})
            </span>
            <button
              onClick={handleAddQuestion}
              className="flex items-center gap-1 text-xs px-3 py-1 bg-white/[0.08] hover:bg-white/[0.14] text-white rounded-full border border-white/10 transition-colors font-medium"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {questions.map((q, idx) => (
              <div
                key={idx}
                onClick={() => setActiveQuestionIndex(idx)}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group ${
                  activeQuestionIndex === idx
                    ? 'bg-white/[0.1] border-white/25 text-white shadow-sm'
                    : 'bg-white/[0.02] border-white/[0.06] text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-200'
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <span className="w-5 h-5 rounded-full bg-white/[0.08] flex items-center justify-center text-[10px] font-semibold shrink-0 text-neutral-300">
                    {idx + 1}
                  </span>
                  <span className="text-xs truncate font-medium">
                    {q.question || `Question ${idx + 1}`}
                  </span>
                </div>
                {questions.length > 1 && (
                  <button
                    onClick={(e) => handleRemoveQuestion(idx, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-neutral-500 hover:text-red-400 transition-opacity"
                    title="Delete question"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleAddQuestion}
            className="w-full mt-auto py-2.5 rounded-full border border-dashed border-white/15 hover:border-white/30 text-neutral-400 hover:text-white flex items-center justify-center gap-2 text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Question
          </button>
        </div>

        {/* Main Editor Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Quiz Metadata (Title & Emoji) */}
          <div className="bg-[#101012] border border-white/[0.08] rounded-3xl p-4 flex flex-col md:flex-row gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">Cover:</label>
              <input
                type="text"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                maxLength={4}
                className="w-12 h-10 text-center text-xl bg-white/[0.04] border border-white/15 rounded-xl focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 text-white"
              />
            </div>
            <div className="flex-1 w-full">
              <input
                type="text"
                placeholder="Quiz Title (e.g. Science & Technology Quiz)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/15 rounded-2xl px-4 py-2.5 text-white font-medium text-base placeholder-neutral-600 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-colors"
              />
            </div>
          </div>

          {/* Active Question Editor */}
          {currentQ && (
            <div className="bg-[#101012] border border-white/[0.08] rounded-3xl p-6 shadow-xl space-y-6">
              {/* Question Settings Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
                <span className="text-neutral-300 font-medium text-xs">
                  Question {activeQuestionIndex + 1} of {questions.length}
                </span>

                <div className="flex items-center gap-4">
                  {/* Timer selection */}
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-neutral-400" />
                    <select
                      value={currentQ.timeLimit}
                      onChange={(e) => handleUpdateQuestion('timeLimit', Number(e.target.value))}
                      className="bg-white/[0.06] text-white text-xs font-medium rounded-full px-3 py-1.5 border border-white/10 focus:outline-none focus:border-white/40"
                    >
                      <option value={10}>10 seconds</option>
                      <option value={15}>15 seconds</option>
                      <option value={20}>20 seconds</option>
                      <option value={30}>30 seconds</option>
                      <option value={60}>60 seconds</option>
                    </select>
                  </div>

                  {/* Points selection */}
                  <div className="flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-neutral-400" />
                    <select
                      value={currentQ.points}
                      onChange={(e) => handleUpdateQuestion('points', Number(e.target.value))}
                      className="bg-white/[0.06] text-white text-xs font-medium rounded-full px-3 py-1.5 border border-white/10 focus:outline-none focus:border-white/40"
                    >
                      <option value={1000}>Standard (1,000 pts)</option>
                      <option value={2000}>Double Points (2,000 pts)</option>
                      <option value={500}>Casual (500 pts)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Question Prompt Input */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-neutral-400 mb-2">
                  Question Prompt
                </label>
                <textarea
                  rows={2}
                  placeholder="Type your question prompt..."
                  value={currentQ.question}
                  onChange={(e) => handleUpdateQuestion('question', e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/15 rounded-2xl p-4 text-white text-base font-normal placeholder-neutral-600 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-colors"
                />
              </div>

              {/* Answer Choices Grid */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-neutral-400 mb-2">
                  Answer Choices (Select the checkmark for the correct answer)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {KAHOOT_COLORS.map((col, idx) => {
                    const isCorrect = currentQ.correctIndex === idx;
                    return (
                      <div
                        key={idx}
                        className={`relative rounded-2xl p-3.5 border transition-all flex items-center gap-3 ${
                          isCorrect
                            ? 'border-emerald-500/60 bg-emerald-950/20 ring-1 ring-emerald-500/30'
                            : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]'
                        }`}
                      >
                        {/* Shape Indicator */}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-semibold ${col.accentBg} ${col.accentText} ${col.accentBorder} border shrink-0`}>
                          {col.shape}
                        </div>

                        {/* Text Input */}
                        <input
                          type="text"
                          placeholder={`Option ${idx + 1}`}
                          value={currentQ.options[idx] || ''}
                          onChange={(e) => handleUpdateOption(idx, e.target.value)}
                          className="flex-1 bg-transparent text-white font-normal text-sm placeholder-neutral-600 focus:outline-none"
                        />

                        {/* Correct Toggle Radio */}
                        <button
                          type="button"
                          onClick={() => handleUpdateQuestion('correctIndex', idx)}
                          className={`p-1.5 rounded-full border transition-all ${
                            isCorrect
                              ? 'bg-emerald-500 text-black border-emerald-400 shadow-sm'
                              : 'bg-white/[0.06] text-neutral-500 border-white/10 hover:text-white'
                          }`}
                          title={isCorrect ? 'Correct answer' : 'Mark as correct'}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Explanation (Optional) */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-neutral-400 mb-1.5">
                  Did You Know / Explanation (Optional, shown during reveal)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Neil Armstrong was the first person to set foot on the moon."
                  value={currentQ.explanation}
                  onChange={(e) => handleUpdateQuestion('explanation', e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 text-neutral-200 text-xs sm:text-sm placeholder-neutral-600 focus:outline-none focus:border-white/30"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
