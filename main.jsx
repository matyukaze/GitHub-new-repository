import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Plus, Trash2, CheckCircle2, Circle, CalendarDays, Search, Bell, Edit3, Download, Upload, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import "./style.css";

const STORAGE_KEY = "lottery-application-tracker-items-v1";

const initialItems = [
  {
    id: 1,
    store: "イオン岡崎",
    product: "ONE PIECEカード 抽選",
    applied: true,
    announceDate: "2026-05-20",
    result: "未発表",
    memo: "アプリ通知確認",
  },
  {
    id: 2,
    store: "ウイングタウン岡崎",
    product: "ポケモンカード BOX",
    applied: false,
    announceDate: "2026-05-22",
    result: "未発表",
    memo: "応募期限も確認",
  },
];

const resultOptions = ["未発表", "当選", "落選", "購入済み"];

function todayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getStatus(item) {
  const today = todayString();
  if (item.result === "当選") return { label: "当選", tone: "green" };
  if (item.result === "落選") return { label: "落選", tone: "gray" };
  if (item.result === "購入済み") return { label: "購入済み", tone: "blue" };
  if (item.announceDate < today) return { label: "確認必要", tone: "red" };
  if (item.announceDate === today) return { label: "本日発表", tone: "orange" };
  return { label: "待機中", tone: "zinc" };
}

function loadItems() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : initialItems;
  } catch {
    return initialItems;
  }
}

function App() {
  const [items, setItems] = useState(loadItems);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("すべて");
  const [form, setForm] = useState({
    store: "",
    product: "",
    applied: true,
    announceDate: todayString(),
    result: "未発表",
    memo: "",
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const text = `${item.store} ${item.product} ${item.memo}`.toLowerCase();
        const matchesQuery = text.includes(query.toLowerCase());
        const status = getStatus(item).label;
        const matchesFilter = filter === "すべて" || item.result === filter || status === filter;
        return matchesQuery && matchesFilter;
      })
      .sort((a, b) => a.announceDate.localeCompare(b.announceDate));
  }, [items, query, filter]);

  const summary = useMemo(() => {
    return {
      total: items.length,
      applied: items.filter((i) => i.applied).length,
      today: items.filter((i) => getStatus(i).label === "本日発表").length,
      needCheck: items.filter((i) => getStatus(i).label === "確認必要").length,
      won: items.filter((i) => i.result === "当選").length,
    };
  }, [items]);

  function addItem(e) {
    e.preventDefault();
    if (!form.store.trim() || !form.product.trim()) return;
    setItems((prev) => [
      ...prev,
      {
        ...form,
        id: Date.now(),
        store: form.store.trim(),
        product: form.product.trim(),
        memo: form.memo.trim(),
      },
    ]);
    setForm({ store: "", product: "", applied: true, announceDate: todayString(), result: "未発表", memo: "" });
  }

  function updateItem(id, patch) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function deleteItem(id) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lottery-tracker-${todayString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJson(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (Array.isArray(data)) setItems(data);
      } catch {
        alert("読み込みに失敗しました。JSONファイルを確認してください。");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="app">
      <div className="container">
        <header className="hero">
          <div>
            <p className="sub">抽選応募・発表日管理</p>
            <h1>抽選トラッカー</h1>
            <p className="desc">応募した店舗、発表日、結果をまとめて管理できます。入力内容はこの端末に自動保存されます。</p>
          </div>
          <div className="topActions">
            <button type="button" className="utility" onClick={exportJson}><Download size={16} />バックアップ</button>
            <label className="utility fileLabel"><Upload size={16} />復元<input type="file" accept="application/json" onChange={importJson} /></label>
          </div>
        </header>

        <section className="summaryGrid">
          <SummaryCard icon={<Bell size={18} />} label="本日発表" value={summary.today} />
          <SummaryCard icon={<CalendarDays size={18} />} label="確認必要" value={summary.needCheck} />
          <SummaryCard icon={<CheckCircle2 size={18} />} label="当選" value={summary.won} />
          <SummaryCard icon={<Edit3 size={18} />} label="未応募" value={items.filter((i) => !i.applied).length} />
        </section>

        <form onSubmit={addItem} className="card">
          <h2>新しく追加</h2>
          <div className="formGrid">
            <input placeholder="店舗名 例：イオン岡崎" value={form.store} onChange={(e) => setForm({ ...form, store: e.target.value })} />
            <input placeholder="商品名 例：ワンピースカード BOX" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} />
            <input type="date" value={form.announceDate} onChange={(e) => setForm({ ...form, announceDate: e.target.value })} />
            <select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })}>{resultOptions.map((option) => <option key={option}>{option}</option>)}</select>
            <label className="check"><input type="checkbox" checked={form.applied} onChange={(e) => setForm({ ...form, applied: e.target.checked })} />応募済みにする</label>
            <input placeholder="メモ 例：アプリ通知、メール確認" value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} />
          </div>
          <button className="primary"><Plus size={18} />追加する</button>
        </form>

        <section className="card">
          <div className="listHeader">
            <h2>抽選一覧</h2>
            <div className="controls">
              <div className="search"><Search size={17} /><input placeholder="店舗・商品で検索" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
              <select value={filter} onChange={(e) => setFilter(e.target.value)}>{["すべて", "本日発表", "確認必要", ...resultOptions].map((option) => <option key={option}>{option}</option>)}</select>
            </div>
          </div>

          <div className="items">
            {filteredItems.length === 0 ? <div className="empty">該当する抽選はありません。</div> : filteredItems.map((item) => {
              const status = getStatus(item);
              return (
                <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="item">
                  <div className="itemMain">
                    <div className="badges">
                      <span className={`badge ${status.tone}`}>{status.label}</span>
                      <button type="button" onClick={() => updateItem(item.id, { applied: !item.applied })} className="appliedBtn">
                        {item.applied ? <CheckCircle2 size={16} /> : <Circle size={16} />}{item.applied ? "応募済み" : "未応募"}
                      </button>
                    </div>
                    <h3>{item.product}</h3>
                    <p>{item.store}</p>
                    {item.memo && <p className="memo">メモ：{item.memo}</p>}
                  </div>
                  <div className="editBox">
                    <label>発表日</label>
                    <input type="date" value={item.announceDate} onChange={(e) => updateItem(item.id, { announceDate: e.target.value })} />
                    <select value={item.result} onChange={(e) => updateItem(item.id, { result: e.target.value })}>{resultOptions.map((option) => <option key={option}>{option}</option>)}</select>
                  </div>
                  <button type="button" onClick={() => deleteItem(item.id)} className="delete"><Trash2 size={18} /></button>
                </motion.div>
              );
            })}
          </div>

          <button type="button" className="reset" onClick={() => setItems(initialItems)}><RotateCcw size={16} />サンプルに戻す</button>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value }) {
  return <div className="summary"><div className="summaryTop"><div className="icon">{icon}</div><p>{value}</p></div><span>{label}</span></div>;
}

createRoot(document.getElementById("root")).render(<App />);
