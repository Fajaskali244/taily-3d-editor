import { Box, SlidersHorizontal, BadgeCheck, Truck } from "lucide-react";

const features = [
  {
    title: "AI 3D Modeling from Your Photo",
    desc: "Upload 1 photo. Our AI turns it into a high-precision 3D model ready for print.",
    Icon: Box
  },
  {
    title: "Customize & Live Preview",
    desc: "Adjust pose, colors, base, and backdrop. See a real-time 3D preview before checkout.",
    Icon: SlidersHorizontal
  },
  {
    title: "Approve Before We Print",
    desc: "Review the 3D model and approve. We lock the file, run QC, then proceed to print.",
    Icon: BadgeCheck
  },
  {
    title: "Premium Mini, Fast Delivery",
    desc: "Hand-finished 3D print with durable coating. Tracked shipping from our Jakarta hub.",
    Icon: Truck
  }
];

export default function WhyChooseLumo() {
  return (
    <section id="why" className="bg-transparent">
      <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
        <h2 className="text-center text-3xl md:text-4xl font-heading tracking-tight">
          Why Choose Lumo?
        </h2>
        <p className="mt-3 text-center text-white/70 max-w-2xl mx-auto font-body">
          Own your memory with high-precision 3D minis: from photo to print, fully under your control.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ title, desc, Icon }) => (
            <div
              key={title}
              className="card-surface rounded-2xl p-6 md:p-8 shadow-brand"
            >
              <Icon aria-hidden className="h-7 w-7 text-white mb-4 opacity-90" />
              <h3 className="text-lg font-semibold font-heading">{title}</h3>
              <p className="mt-2 text-sm text-white/75 leading-relaxed font-body">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
