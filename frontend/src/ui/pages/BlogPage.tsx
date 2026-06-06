import { legacyAsset } from '../lib/assets';

/** 1:1 me përmbajtjen kryesore të `LB-Techworks/blog.html` */
export function BlogPage() {
  const posts = [
    {
      img: legacyAsset('img/blog/1.png'),
      title: 'LB TECHWORKS',
      text: 'NE KERRKIM TE PERFEKSIONIT ME NDIHMEN E PARTNERËRËVE TONË MË TË RI NUK KA ASGJË QË NUK DO GJENI TEK NE',
    },
    {
      img: legacyAsset('img/blog/2.png'),
      title: 'PARTNERET NE ZERIM',
      text: 'ARRIM NJE KUALITET FANTASTIK TE ZERIT ME ANE TE PAJISJEVE TONA NGA : YAMAHA FONESTAR C-YARK',
    },
    {
      img: legacyAsset('img/blog/3.png'),
      title: 'PARTNERET NE AKSESORE',
      text: 'NUK KA ASGJË QË NUK DO GJENI TEK NE QOFTE PC QOFTE SMARTPHONE TEK NE PAJISJET NUK KANE LIMIT',
    },
    {
      img: legacyAsset('img/blog/4.png'),
      title: 'PARTNERET NE TELEFONAT',
      text: 'KERRKESAT E LARTA PER KTO DY KOMPANI NA BENE QE TUA SJELLIM TEK JU ME TE GJITHA MODELET E MUNDSHME PO ASHTU DHE ME GARANCION',
    },
  ];

  return (
    <>
      <section id="page-header" className="blog-header"></section>
      <section id="blog">
        {posts.map((p, idx) => (
          <div className="blog-box" key={idx}>
            <div className="blog-img">
              <img src={p.img} alt="" />
            </div>
            <div className="blog-details">
              <h4>{p.title}</h4>
              <p>{p.text}</p>
            </div>
          </div>
        ))}
      </section>
      <section id="pagination" className="section-p1">
        <a href="#">1</a>
        <a href="#">2</a>
        <a href="#">
          <i className="fal fa-long-arrow-alt-right "></i>
        </a>
      </section>
    </>
  );
}
