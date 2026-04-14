'use client'

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toHalfWidthKana } from "@/lib/kana-utils";

interface Drug {
  iyaku_code: string;
  name_kanji: string;
  name_kana: string;
  unit_name: string;
  price: number;
  controlled_drugs: string;
  dosage_form: string;
  yakkasyusai_code: string;
  transitional_measures: string;
  generic_code: string;
  generic_name: string;
  additional_fee: number;
}

const CONTROLLED_DRUG_LABELS: Record<string, string> = {
  "1": "麻薬",
  "2": "毒薬",
  "3": "覚醒剤原料",
  "5": "向精神薬",
};

function formatTransitionalMeasures(value: string): string | null {
  if (!value || value === "0") return null;
  const y = value.slice(0, 4);
  const m = value.slice(4, 6);
  const d = value.slice(6, 8);
  return `${y}年${m}月${d}日まで`;
}

function formatPrice(price: number): string {
  return price.toLocaleString("ja-JP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + "円";
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Drug[]>([]);
  const [selected, setSelected] = useState<Drug | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [tooShort, setTooShort] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  async function handleSearch() {
    const trimmed = query.trim();
    if (!trimmed) return;

    if ([...trimmed].length < 3) {
      setTooShort(true);
      setSearched(false);
      setResults([]);
      return;
    }

    setTooShort(false);
    setLoading(true);
    setSelected(null);
    setSearched(true);

    const halfKana = toHalfWidthKana(trimmed);

    const { data, error } = await supabase
      .from("drugs")
      .select("*")
      .or(`name_kana.ilike.%${halfKana}%,name_kanji.ilike.%${trimmed}%`)
      .limit(100);

    if (!error && data) {
      setResults(data as Drug[]);
    } else {
      setResults([]);
    }

    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSearch();
  }

  const controlledLabel = selected
    ? CONTROLLED_DRUG_LABELS[selected.controlled_drugs] ?? null
    : null;
  const transitionalLabel = selected
    ? formatTransitionalMeasures(selected.transitional_measures)
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ヘッダー */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">薬価サーチ</h1>
            <button
              onClick={() => setDark(!dark)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {dark ? "☀ ライト" : "☾ ダーク"}
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="医薬品名を入力（例：ガスター、アムロジピン）"
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "検索中…" : "検索"}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 flex gap-4">
        {/* 検索結果一覧（スマホで詳細表示中は下部スペース確保） */}
        <div className={`flex-1 min-w-0 ${selected ? "list-with-detail-padding" : ""}`}>
          {tooShort && (
            <p className="text-red-500 dark:text-red-400 text-sm">3文字以上で入力してください。</p>
          )}
          {searched && !loading && results.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 text-sm">該当する医薬品が見つかりませんでした。</p>
          )}
          {results.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{results.length}件を表示</p>
              {results.map((drug) => (
                <button
                  key={drug.iyaku_code}
                  onClick={() => setSelected(drug)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    selected?.iyaku_code === drug.iyaku_code
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950"
                  }`}
                >
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{drug.name_kanji}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatPrice(drug.price)} / {drug.unit_name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 詳細パネル：PCは右サイド、スマホは画面下部に固定 */}
        {selected && (
          <div className="detail-panel-wrapper">
            <div className="detail-panel-inner bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-start justify-between gap-2 mb-4">
                <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-snug">{selected.name_kanji}</h2>
                <button
                  onClick={() => setSelected(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none shrink-0"
                >
                  ×
                </button>
              </div>

              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">薬価</dt>
                  <dd className="font-semibold text-gray-800 dark:text-gray-100">{formatPrice(selected.price)} / {selected.unit_name}</dd>
                </div>

                {controlledLabel && (
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400">規制区分</dt>
                    <dd>
                      <span className="inline-block bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-xs font-medium px-2 py-0.5 rounded">
                        {controlledLabel}
                      </span>
                    </dd>
                  </div>
                )}

                {transitionalLabel && (
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400">経過措置期限</dt>
                    <dd className="text-orange-600 dark:text-orange-400 font-medium">{transitionalLabel}</dd>
                  </div>
                )}

                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">一般名</dt>
                  <dd className="text-gray-700 dark:text-gray-300">{selected.generic_name || "−"}</dd>
                </div>

                {Number(selected.additional_fee) === 1 && (
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400">選定療養</dt>
                    <dd>
                      <span className="inline-block bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 text-xs font-medium px-2 py-0.5 rounded">
                        対象
                      </span>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
