import Footer from "./Footer";
import Header from "./Header";

interface Props {
  children?: React.ReactNode;
}

const Layout = ({ children, ...props }: Props) => {
  return (
    //Set for all pages height and width to full screen
    <div className="h-screen w-screen">
      <Header />
      <main className="px-4 lg:px-20 pt-[7rem] lg:pt-[8rem] pb-10" {...props}>
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
