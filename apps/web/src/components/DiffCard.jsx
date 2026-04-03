function tokenize(text) {
  return text.split(/\s+/).filter(Boolean);
}

function buildWordDiff(before, after) {
  const left = tokenize(before);
  const right = tokenize(after);
  const dp = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));

  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      dp[i][j] = left[i] === right[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const beforeTokens = [];
  const afterTokens = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      beforeTokens.push({ type: "same", value: left[i] });
      afterTokens.push({ type: "same", value: right[j] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      beforeTokens.push({ type: "removed", value: left[i] });
      i += 1;
    } else {
      afterTokens.push({ type: "added", value: right[j] });
      j += 1;
    }
  }

  while (i < left.length) {
    beforeTokens.push({ type: "removed", value: left[i] });
    i += 1;
  }
  while (j < right.length) {
    afterTokens.push({ type: "added", value: right[j] });
    j += 1;
  }

  return { beforeTokens, afterTokens };
}

function renderTokens(tokens, type) {
  return tokens.map((token, index) => {
    if (token.type === "removed" && type === "before") {
      return (
        <del key={`${token.value}-${index}`} className="rounded bg-rose-100 px-1 text-rose-700">
          {token.value}{" "}
        </del>
      );
    }
    if (token.type === "added" && type === "after") {
      return (
        <ins key={`${token.value}-${index}`} className="rounded bg-emerald-100 px-1 text-emerald-700 no-underline">
          {token.value}{" "}
        </ins>
      );
    }
    return <span key={`${token.value}-${index}`}>{token.value} </span>;
  });
}

function confidenceLabel(confidence) {
  if (confidence >= 0.8) return "High";
  if (confidence >= 0.6) return "Medium";
  return "Low";
}

export default function DiffCard({ suggestion, index, decision, label, onAccept, onReject }) {
  const { beforeTokens, afterTokens } = buildWordDiff(suggestion.original_text, suggestion.suggested_text);
  const accepted = decision === "accepted";
  const rejected = decision === "rejected";

  function handleKeyDown(event) {
    const key = event.key.toLowerCase();
    if (key === "a") {
      event.preventDefault();
      onAccept();
    }
    if (key === "r") {
      event.preventDefault();
      onReject();
    }
    if (key === " ") {
      event.preventDefault();
      if (accepted) {
        onAccept();
      } else if (rejected) {
        onReject();
      } else {
        onAccept();
      }
    }
  }

  return (
    <article
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`rounded-[2rem] border bg-white p-6 shadow-panel outline-none transition duration-300 ease-out animate-[fade-up_420ms_ease_forwards] ${
        accepted ? "border-transparent ring-2 ring-accent/40 shadow-[0_22px_55px_rgba(1,105,111,0.18)]" : "border-stone-200"
      } ${rejected ? "opacity-50" : ""}`}
      style={{ animationDelay: `calc(${index} * 60ms)` }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-stone-600">
          {label}
        </span>
        <span className="rounded-full border border-stone-200 px-3 py-1 text-xs font-semibold text-stone-600">
          {confidenceLabel(suggestion.confidence)} confidence
        </span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div className="rounded-[1.5rem] border border-rose-100 bg-[#fff5f5] p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-rose-500">Before</p>
          <div className="text-sm leading-7 text-stone-700">{renderTokens(beforeTokens, "before")}</div>
        </div>
        <div className="rounded-[1.5rem] border border-emerald-100 bg-[#f0fff4] p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">After</p>
          <div className={`text-sm leading-7 text-stone-700 ${rejected ? "line-through" : ""}`}>
            {renderTokens(afterTokens, "after")}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {suggestion.keywords_added.map((keyword) => (
          <span key={keyword} className="rounded-full border border-accent/20 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent">
            {keyword}
          </span>
        ))}
      </div>

      <p className="mt-4 text-sm italic text-stone-500">{suggestion.reason}</p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onAccept}
          className={`rounded-full px-4 py-3 text-sm font-semibold transition ${
            accepted ? "bg-accent text-white scale-100" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
        >
          Accept
        </button>
        <button
          type="button"
          onClick={onReject}
          className={`rounded-full px-4 py-3 text-sm font-semibold transition ${
            rejected ? "bg-rose-600 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
        >
          Reject
        </button>
      </div>
    </article>
  );
}
