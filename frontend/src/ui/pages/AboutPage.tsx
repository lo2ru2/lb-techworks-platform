import { legacyAsset } from '../lib/assets';

export function AboutPage() {
  return (
    <>
      <section id="page-header5" className="about-header"></section>
      <section id="about-head" className="section-p1">
        <img className="lb-about-img" src={legacyAsset('img/about/a6.jpg')} alt="LB Techworks" />
        <div>
          <h2>Kush jemi ne</h2>
          <p>
            Ne jemi një kompani e re e sapo krijuar me qellim te ofrojme produkte te reja cilesore qe na nxisin te kemi ide
            te reja dhe te ndihmojme klientet ne zgjedhjen e produkteve me te mira
          </p>
          <br />
          <br />
          <div
            style={{
              background: '#ccc',
              padding: '12px 16px',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            Mirsevini ne LB Techworks
          </div>
        </div>
      </section>
      <section id="about-app" className="section-p1">
        <video className="lb-about-video" autoPlay muted loop playsInline src={legacyAsset('img/about/1.mp4')}></video>
      </section>
    </>
  );
}

