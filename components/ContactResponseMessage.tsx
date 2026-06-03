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
        className={`fixed bottom-4 left-1/2 z-50 flex w-[min(90vw,20rem)] -translate-x-1/2 items-center overflow-hidden rounded-lg py-2 lg:py-4 ${background} animate-popup`}
      >
        <h2 className="relative z-10 pl-2 text-lg text-[#F0FDF4]">
          {alertMessage}
        </h2>
        <div
          className={`absolute bottom-0 left-0 h-2 ${fill} animate-fill rounded-b-lg`}
        ></div>
      </div>
    </>
  );
};

export default ContactResponseMessage;
