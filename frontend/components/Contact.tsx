import Image from "next/image";
import AachenMap from "@/public/map_aachen.png";
import { FormEvent, useReducer } from "react";

interface Input {
  email: string;
  message: string;
  number: string;
}

const Contact = () => {
  const [event, updateEvent] = useReducer(
    (prev: Input, next: Partial<Input>) => {
      return { ...prev, ...next };
    },
    { email: "", message: "", number: "" }
  );

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  return (
    <div className="w-full flex flex-col gap-5">
      <div className="text-[#000D36]">
        <h2 className="font-bold text-2xl mb-5">Let&apos;s stay connected</h2>
        <p className="text-base font-normal">
          Erfahre in deinem ganz persönlichen Erstgespräch wie Swibble deinem
          Unternehmen weiterhelfen kann.
        </p>
      </div>
      <div className="rounded-[14px]">
        <Image
          src={AachenMap}
          alt="map"
          width={343}
          height={202}
          className="w-full"
        />
      </div>
      <div className="w-full flex justify-between items-start">
        <div>
          <h3 className="font-bold text-base text-[#2A3342]">Anschrift</h3>
          <p className="text-sm text-[#556987]">
            Königsstraße 30, <br />
            52064 Aachen
          </p>
        </div>
        <div>
          <h3 className="font-bold text-base text-[#2A3342]">E-mail</h3>
          <p className="text-sm text-[#556987]">
            <a href="mailto:contact@swibble.net">contact@swibble.net</a>
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            pattern="[0-9]{3}-[0-9]{2}-[0-9]{3}"
            placeholder="Deine Telefonnummer"
            value={event.number}
            onChange={(e) => updateEvent({ number: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="text">Nachricht*</label>
          <br />
          <textarea
            className="w-full bg-[#F6F6F6] h-24 rounded-lg focus:!outline-none pl-2 mt-3 placeholder:font-normal placeholder:text-sm placeholder:text-[#CEC3D2]"
            name="text"
            maxLength={80}
            placeholder="Vor welchen Herausforderungen steht dein Unternehmen?"
            required
            value={event.message}
            onChange={(e) => updateEvent({ message: e.target.value })}
          />
        </div>
        <button
          type="submit"
          className="w-44 text-center text-sm font-medium bg-[#B718EC] text-[#F0FDF4] py-[0.781rem] px-5 rounded-[10px] hover:scale-95 transition duration-200"
        >
          Konstenlos Starten
        </button>
      </form>
    </div>
  );
};

export default Contact;
