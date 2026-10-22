import { auth } from "@/auth";
import { Cta } from "@/components/landing/cta";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { GoalsShowcase } from "@/components/landing/goals-showcase";
import { Hero } from "@/components/landing/hero";
import { Navbar } from "@/components/landing/navbar";
import { SmoothScroll } from "@/components/landing/smooth-scroll";
import { Statement } from "@/components/landing/statement";
import { Why } from "@/components/landing/why";
import { MeshBackdrop } from "@/components/ui/mesh-backdrop";

export default async function LandingPage() {
  const loggedIn = Boolean(await auth());

  return (
    <>
      <SmoothScroll />
      <MeshBackdrop />
      <Navbar loggedIn={loggedIn} />
      <main className="overflow-x-clip">
        <Hero loggedIn={loggedIn} />
        <Statement />
        <Features />
        <GoalsShowcase />
        <Why />
        <Cta loggedIn={loggedIn} />
      </main>
      <Footer />
    </>
  );
}
