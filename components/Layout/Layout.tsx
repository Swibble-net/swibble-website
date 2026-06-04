import Footer from "./Footer";
import Header from "./Header";

interface Props {
  children?: React.ReactNode;
}

const Layout = ({ children, ...props }: Props) => {
  return (
    //Set for all pages height and width to full screen
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main
        className="flex-1 px-4 pb-10 pt-[7rem] lg:px-20 lg:pt-[8rem]"
        {...props}
      >
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
