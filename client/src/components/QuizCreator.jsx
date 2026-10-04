import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle2, Clock, Award, ArrowLeft, Save, Sparkles, Download, Upload } from 'lucide-react';
import { KAHOOT_COLORS } from '../constants';

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          coverImage,
          questions
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save quiz on server.');
      }

      const savedQuiz = await response.json();
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
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-400" />
              Quiz Builder Studio
            </h1>
            <p className="text-slate-400 text-sm">Design custom questions, set timers, and host live!</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold cursor-pointer border border-slate-700">
            <Upload className="w-4 h-4" />
            <span>Import</span>
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold border border-slate-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>

          <button
            onClick={() => handleSaveQuiz(false)}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Quiz</span>
          </button>

          <button
            onClick={() => handleSaveQuiz(true)}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>Save & Host Game</span>
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
        <div className="lg:col-span-1 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-400">
              Questions ({questions.length})
            </span>
            <button
              onClick={handleAddQuestion}
              className="flex items-center gap-1 text-xs px-2.5 py-1 bg-purple-600/40 hover:bg-purple-600 text-purple-200 hover:text-white rounded-lg transition-colors font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {questions.map((q, idx) => (
              <div
                key={idx}
                onClick={() => setActiveQuestionIndex(idx)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${
                  activeQuestionIndex === idx
                    ? 'bg-purple-900/30 border-purple-500 text-white shadow-md'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <span className="w-6 h-6 rounded-md bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-sm truncate font-medium">
                    {q.question || `Question ${idx + 1}`}
                  </span>
                </div>
                {questions.length > 1 && (
                  <button
                    onClick={(e) => handleRemoveQuestion(idx, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-red-400 hover:bg-red-950 transition-opacity"
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
            className="w-full mt-auto py-2.5 rounded-xl border-2 border-dashed border-slate-700 hover:border-purple-500 text-slate-400 hover:text-purple-300 flex items-center justify-center gap-2 text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Question
          </button>
        </div>

        {/* Main Editor Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Quiz Metadata (Title & Emoji) */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-xs uppercase tracking-wider font-bold text-slate-400">Cover:</label>
              <input
                type="text"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                maxLength={4}
                className="w-12 h-11 text-center text-2xl bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="flex-1 w-full">
              <input
                type="text"
                placeholder="Quiz Title (e.g., Marvel Superheroes Quiz)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-bold text-lg placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Active Question Editor */}
          {currentQ && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              {/* Question Settings Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <span className="text-purple-400 font-bold text-sm">
                  Editing Question {activeQuestionIndex + 1} of {questions.length}
                </span>

                <div className="flex items-center gap-4">
                  {/* Timer selection */}
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <select
                      value={currentQ.timeLimit}
                      onChange={(e) => handleUpdateQuestion('timeLimit', Number(e.target.value))}
                      className="bg-slate-800 text-white text-sm font-semibold rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:border-purple-500"
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
                    <Award className="w-4 h-4 text-amber-400" />
                    <select
                      value={currentQ.points}
                      onChange={(e) => handleUpdateQuestion('points', Number(e.target.value))}
                      className="bg-slate-800 text-white text-sm font-semibold rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:border-purple-500"
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
                <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">
                  Question Prompt
                </label>
                <textarea
                  rows={2}
                  placeholder="Type your question here..."
                  value={currentQ.question}
                  onChange={(e) => handleUpdateQuestion('question', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-4 text-white text-lg font-medium placeholder-slate-600 focus:outline-none focus:border-purple-500 shadow-inner"
                />
              </div>

              {/* Answer Choices Grid */}
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">
                  Answer Choices (Select the radio icon on the correct answer)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {KAHOOT_COLORS.map((col, idx) => {
                    const isCorrect = currentQ.correctIndex === idx;
                    return (
                      <div
                        key={idx}
                        className={`relative rounded-2xl p-4 border-2 transition-all flex items-center gap-3 ${
                          isCorrect
                            ? 'border-emerald-400 ring-2 ring-emerald-500/30 bg-slate-800/90'
                            : 'border-slate-700 bg-slate-800/40 hover:bg-slate-800/70'
                        }`}
                      >
                        {/* Shape Indicator */}
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl text-white shadow"
                          style={{ backgroundColor: col.colorHex }}
                        >
                          {col.shape}
                        </div>

                        {/* Text Input */}
                        <input
                          type="text"
                          placeholder={`Option ${idx + 1}`}
                          value={currentQ.options[idx] || ''}
                          onChange={(e) => handleUpdateOption(idx, e.target.value)}
                          className="flex-1 bg-transparent text-white font-semibold text-base placeholder-slate-500 focus:outline-none"
                        />

                        {/* Correct Toggle Radio */}
                        <button
                          type="button"
                          onClick={() => handleUpdateQuestion('correctIndex', idx)}
                          className={`p-2 rounded-xl border transition-all ${
                            isCorrect
                              ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg'
                              : 'bg-slate-700/50 text-slate-400 border-slate-600 hover:text-white'
                          }`}
                          title={isCorrect ? 'Correct answer' : 'Mark as correct'}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Explanation (Optional) */}
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">
                  Did You Know / Explanation (Shown after question is revealed)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Neil Armstrong was the first person to set foot on the moon."
                  value={currentQ.explanation}
                  onChange={(e) => handleUpdateQuestion('explanation', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-300 text-sm placeholder-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
