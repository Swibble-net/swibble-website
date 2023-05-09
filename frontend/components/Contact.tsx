// Importing necessary React components
import Image from "next/image";
import AachenMap from "@/public/map_aachen.png";
import { FormEvent, useEffect, useReducer, useState } from "react";
import sendEmail from "@/lib/sendMail";
import ContactAlert from "./ContactAlert";

// Defining expected input properties for `updateEvent` reducer
interface Input {
  email: string;
  message: string;
  number: string;
  alert: boolean;
}

// Defining the main component
const Contact = () => {
  // Creating state and updating function using `useReducer`
  const [event, updateEvent] = useReducer(
    (prev: Input, next: Partial<Input>) => {
      return { ...prev, ...next };
    },
    { email: "", message: "", number: "", alert: false }
  );

  // Creating a state for response message after submitting the contact form
  const [responseMessage, setResponseMessage] = useState({
    backgroundColor: "",
    alertMessage: "",
    fillColor: "",
  });

  // Handling submit event for form
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    // Prevent to refresh the page
    e.preventDefault();
    // async function to send filled form
    try {
      const req = await sendEmail(event.email, event.number, event.message);
      if (req.status === 200) {
        setResponseMessage({
          alertMessage: "Abgeschickt!",
          backgroundColor: "bg-[#B718EC]",
          fillColor: "bg-[#e7a1ff]",
        });
      }
    } catch (e) {
      console.log(e);
      setResponseMessage({
        alertMessage: "Fehlgeschlagen",
        backgroundColor: "bg-red-500",
        fillColor: "bg-red-300",
      });
    }

    // Resetting the `event` state properties back to empty strings on form submission
    updateEvent({ email: "" });
    updateEvent({ number: "" });
    updateEvent({ message: "" });
    updateEvent({ alert: true });
  };

  // Setting variables for alert message props
  const alertMessage: string = responseMessage.alertMessage;
  const backgroundColor: string = responseMessage.backgroundColor;
  const fillColor: string = responseMessage.fillColor;

  //useEffect with timer for closing alert message wich react on "alert" state
  useEffect(() => {
    setTimeout(() => {
      updateEvent({ alert: false });
    }, 7000);
  }, [event.alert]);

  // Rendering the component
  return (
    <>
      <div className="w-full flex flex-col gap-y-5 lg:flex-row lg:justify-between lg:items-center lg:gap-x-24">
        {/* Displaying address and contact information */}
        <div className="flex flex-col gap-y-5 w-full lg:w-7/12 lg:gap-y-20">
          <div className="text-[#000D36]">
            <h2 className="font-bold text-2xl mb-5 lg:text-5xl">
              Let&apos;s stay connected
            </h2>
            <p className="text-base font-normal lg:text-xl">
              Erfahre in deinem ganz persönlichen Erstgespräch wie Swibble
              deinem Unternehmen weiterhelfen kann.
            </p>
          </div>

          {/* Displaying a map and additional contact information */}
          <div className="rounded-[14px] flex flex-col gap-5 w-full lg:w-8/12 md:w-8/12">
            <Image
              src={AachenMap}
              alt="map"
              width={0} // placeholders for `width` and `height`
              height={0} // since they will be taken from the `src` image
              className="w-full"
            />

            {/* Displaying address and email information */}
            <div className="w-full flex flex-row justify-between lg:flex-row-reverse lg:justify-around items-start">
              <div className="relative pl-2">
                <h3 className="font-bold text-base text-[#2A3342]">
                  Anschrift
                </h3>
                <p className="text-sm text-[#556987]">
                  Königstraße 30, <br />
                  52064 Aachen
                </p>
                <div className="none lg:absolute lg:w-[0.188rem] lg:h-20 lg:bg-[#B718EC] lg:rounded-b-full lg:left-0 lg:bottom-1"></div>
              </div>
              <div className="relative pl-2">
                <h3 className="font-bold text-base text-[#2A3342]">E-mail</h3>
                <p className="text-sm text-[#556987]">
                  <a href="mailto:contact@swibble.net">contact@swibble.net</a>
                </p>
                <div className="none lg:absolute lg:w-[0.188rem] lg:h-16 lg:-z-10 lg:bg-[#B718EC] lg:rounded-b-full lg:left-0 lg:bottom-1"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Displaying a form for submitting messages */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 w-full lg:w-5/12"
        >
          <div>
            <label htmlFor="email">E-Mail*</label>
            <br />
            <input
              className="w-full bg-[#F6F6F6] h-12 rounded-lg focus:!outline-none pl-2 mt-3 placeholder:font-normal placeholder:text-sm placeholder:text-[#CEC3D2]"
              name="email"
              type="email"
              placeholder="Deine E-Mail Adresse"
              required
              value={event.email}
              onChange={(e) => updateEvent({ email: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="Telefonnummer">Telefonnummer (Optional)</label>
            <br />
            <input
              className="w-full bg-[#F6F6F6] h-12 rounded-lg focus:!outline-none pl-2 mt-3 placeholder:font-normal placeholder:text-sm placeholder:text-[#CEC3D2]"
              type="tel"
              name="Telefonnummer"
              placeholder="Deine Telefonnummer"
              value={event.number}
              onChange={(e) => updateEvent({ number: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="text">Nachricht*</label>
            <br />
            <textarea
              className="w-full bg-[#F6F6F6] h-24 rounded-lg resize-none focus:!outline-none pl-2 mt-3 placeholder:font-normal placeholder:text-sm placeholder:text-[#CEC3D2]"
              name="text"
              maxLength={200}
              placeholder="Vor welchen Herausforderungen steht dein Unternehmen?"
              required
              value={event.message}
              onChange={(e) => updateEvent({ message: e.target.value })}
            />
          </div>
          <button
            type="submit"
            className="w-44 lg:self-center text-center text-sm font-medium bg-[#B718EC] text-[#F0FDF4] py-[0.781rem] px-5 rounded-[10px] hover:scale-95 transition duration-200"
          >
            Konstenlos Starten
          </button>
        </form>
      </div>
      {/* Dispalying alert message depending on event.alert state */}
      {event.alert ? (
        <ContactAlert
          alertMessage={alertMessage}
          background={backgroundColor}
          fill={fillColor}
        />
      ) : (
        ""
      )}
    </>
  );
};

export default Contact;
