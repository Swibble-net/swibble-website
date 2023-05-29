const ContactResponseMessage = ({
  alertMessage,
  background,
  fill,
}: {
  alertMessage: string;
  background: string;
  fill: string;
}) => {
  return (
    <>
      <div
        className={`fixed z-10  left-[50%] -translate-x-[50%] w-[50%] lg:w-80 py-2 lg:py-4 rounded-lg ${background} animate-popup flex items-center`}
      >
        <h2 className="text-lg text-[#F0FDF4] pl-2">{alertMessage}</h2>
        <div
          className={`fixed h-2 bottom-0 ${fill} animate-fill rounded-b-lg`}
        ></div>
      </div>
    </>
  );
};

export default ContactResponseMessage;
