import Navbar from "@/components/Header/Navbar/Navbar";

/** Fixed site bar, solid on every page. */
export default function Header() {
  return (
    <header className="tc-header">
      <div className="tc-container tc-header__container">
        <Navbar />
      </div>
    </header>
  );
}
