const mechanics = [
  {
    name: "Debounce",
    line: "Requests wait for the pause, not the keystroke.",
  },
  {
    name: "Cancellation",
    line: "A newer query aborts the stale request mid-flight.",
  },
  {
    name: "Client cache",
    line: "Repeat queries answer from memory, instantly.",
  },
  {
    name: "Keyboard navigation",
    line: "The whole instrument works without a mouse.",
  },
  {
    name: "ARIA",
    line: "A combobox screen readers actually understand.",
  },
];

export default function Mechanics() {
  return (
    <section aria-labelledby="mechanics-title" className="tc-section">
      <div className="tc-container-wide">
        <header className="tc-section-header">
          <p className="tc-meta tc-meta-caps tc-eyebrow">
            The efficiency stack
          </p>
          <h2 id="mechanics-title">Built by hand, on purpose.</h2>
          <p className="tc-body-lg">
            No data-fetching library, no component kit. The parts most projects
            install are the parts this one exists to build.
          </p>
        </header>
        <ul className="tc-mechanics-grid">
          {mechanics.map((item) => (
            <li className="tc-mechanics-card" key={item.name}>
              <h3>{item.name}</h3>
              <p>{item.line}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
