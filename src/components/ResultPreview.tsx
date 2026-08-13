import Icon from "@/components/Icon";

const rows = [
  { title: "Minari", type: "Movie", active: true },
  { title: "Miyazaki", type: "Person", active: false },
  { title: "Miramax", type: "Studio", active: false },
];

// Static mockup of the §5 suggestion panel — Tier 1 rows only.
// Deliberately no listbox or option semantics: nothing here is interactive.
export default function ResultPreview() {
  return (
    <section aria-labelledby="preview-title" className="tc-section">
      <div className="tc-container-content">
        <header className="tc-section-header">
          <p className="tc-meta tc-meta-caps tc-eyebrow">Tier 1</p>
          <h2 id="preview-title">Finished before the data arrives.</h2>
          <p className="tc-body-lg">
            Rows read as complete with a title and media type alone — posters
            and metadata hydrate later, or never.
          </p>
        </header>
        <div className="tc-preview-panel">
          <ul className="tc-result-list">
            {rows.map((row) => (
              <li
                className={`tc-result-row${row.active ? " tc-result-row-active" : ""}`}
                key={row.title}
              >
                <span className="tc-result-title">{row.title}</span>
                {row.active && (
                  <Icon
                    className="tc-result-hint"
                    name="corner-down-left"
                    size="sm"
                  />
                )}
                <span className="tc-meta tc-tag">{row.type}</span>
              </li>
            ))}
            <li className="tc-result-row tc-result-more">
              <span className="tc-result-title">View all results for “mi”</span>
              <Icon name="arrow-right" size="sm" />
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
