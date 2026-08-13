const beats = [
  {
    num: "01",
    name: "Search",
    line: "Start typing — three letters is plenty.",
  },
  {
    num: "02",
    name: "Resolve",
    line: "Suggestions settle as you pause, ranked by match, not popularity.",
  },
  {
    num: "03",
    name: "Watch",
    line: "Land on the film, not on a page of maybes.",
  },
];

export default function Narrative() {
  return (
    <section aria-labelledby="narrative-title" className="tc-section">
      <div className="tc-container-content">
        <header className="tc-section-header">
          <p className="tc-meta tc-meta-caps tc-eyebrow">How it feels</p>
          <h2 id="narrative-title">Search. Resolve. Watch.</h2>
        </header>
        <ol className="tc-narrative-beats">
          {beats.map((beat) => (
            <li className="tc-narrative-beat" key={beat.name}>
              <span aria-hidden="true" className="tc-meta tc-eyebrow">
                {beat.num}
              </span>
              <h3>{beat.name}</h3>
              <p>{beat.line}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
