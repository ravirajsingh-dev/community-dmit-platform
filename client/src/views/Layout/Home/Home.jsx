import React from "react";
import { connect } from "react-redux";
import HeroSection from "../Components/HeroSection";
import SliderComponent from "../Components/Slider";
import KeyFeatures from "../Components/KeyFeatures";
import About from "../Components/About";
import Gallery from "../Components/Gallery";
import Video from "../Components/Video";
import News from "../Components/News";
import Documents from "../Components/Documents";
import Process from "../Components/Process";

const Home = ({ commonSettings }) => {
  const showBannerSlider =
    commonSettings?.homepage?.hero?.showBannerSlider === true;

  return (
    <main className="home-page" role="main">
      <HeroSection />
      {showBannerSlider && <SliderComponent />}
      <KeyFeatures />
      <About />
      <Process />
      <Gallery />
      <Video />
      <News />
      <Documents />
    </main>
  );
};

const mapStateToProps = (state) => ({
  commonSettings: state.common?.commonSettings || {},
});

export default connect(mapStateToProps)(Home);
