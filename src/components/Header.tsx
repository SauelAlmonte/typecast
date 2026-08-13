import Icon from "@/components/Icon";

export default function Header() {
  return (
    <header className="tc-header">
      <nav aria-label="Primary" className="tc-container-wide tc-header-nav">
        <span className="tc-wordmark tc-header-brand">TypeCast</span>
        <a
          className="tc-header-link"
          href="https://github.com/SauelAlmonte/typecast"
        >
          <Icon name="github" size="sm" />
          GitHub
        </a>
      </nav>
    </header>
  );
}
