import Menu from "./Menu";

interface IMenu {
  menu: boolean;
  handleOnClick: () => void;
}

const BurgerMenu = ({ menu, handleOnClick }: IMenu) => {
  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="Menü schließen"
        className={`fixed inset-x-0 bottom-0 top-[5.25rem] z-40 bg-black/20 transition-opacity duration-200 ease-out ${
          menu ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={handleOnClick}
        tabIndex={menu ? 0 : -1}
      />
      <nav
        aria-label="Mobile Navigation"
        aria-hidden={!menu}
        className={`fixed left-0 right-0 top-[5.25rem] z-40 max-h-[calc(100dvh-5.25rem)] overflow-y-auto bg-[#FDF5FF] px-4 shadow-lg transition-all duration-200 ease-out ${
          menu
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-2 pointer-events-none opacity-0"
        }`}
      >
        <Menu handleOnClick={handleOnClick} />
      </nav>
    </div>
  );
};

export default BurgerMenu;
