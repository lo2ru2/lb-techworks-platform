import { useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../lib/api';

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  return (
    <>
      <section id="page-header6" className="about-header"></section>
      <section id="contact-detail" className="section-p1">
        <div className="details">
          <span>EJANI NA VIZITONI</span>
          <h2>Na gjeni edhe ne lokacionin tonë të ri</h2>
          <h3>Gjindemi</h3>

          <div className="list">
            <li>
              <i className="fal fa-map"></i>
              <p>Mbretëresha Teutë, Pejë 30000</p>
            </li>
            <li>
              <i className="fal fa-envelope"></i>
              <p>lbtechworks@gmail.com</p>
            </li>
            <li>
              <i className="fal fa-phone-alt"></i>
              <p>+383 49 123 456</p>
            </li>
            <li>
              <i className="fal fa-clock"></i>
              <p>Hëne - Shtune: 9.00 - 20.00</p>
            </li>
          </div>
        </div>
        <div className="map">
          <iframe
            title="LB Techworks map"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2933.9521411340684!2d20.294399576362615!3d42.6623695711663!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1352fdc3f14ce4fd%3A0x20e901b231adcf65!2sLB%20TECHWORKS!5e0!3m2!1sen!2s!4v1733008579825!5m2!1sen!2s"
          ></iframe>
        </div>
      </section>
      <section id="form-details">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSending(true);
            try {
              await axios.post(`${API_BASE}/contact`, { name, email, subject, message });
              alert('Mesazhi u dërgua me sukses.');
              setName('');
              setEmail('');
              setSubject('');
              setMessage('');
            } catch {
              alert('Dështoi dërgimi i mesazhit. Provo përsëri.');
            } finally {
              setSending(false);
            }
          }}
        >
          <span>Lini një mesazh</span>
          <h2>Na dërgoni një email</h2>
          <input type="text" placeholder="Emri juaj" value={name} onChange={(e) => setName(e.target.value)} />
          <input type="text" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="text" placeholder="Subjekti" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <textarea
            cols={30}
            rows={10}
            placeholder="Mesazhi juaj"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          ></textarea>
          <button className="normal" type="submit" disabled={sending}>
            {sending ? 'Duke dërguar...' : 'Dërgo'}
          </button>
        </form>
      </section>
    </>
  );
}
