class ShowcaseElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100vw;
          height: 100vh;
          background-color: #000;
          color: white;
          font-family: 'Helvetica Neue', Arial, sans-serif;
          position: relative;
          overflow: hidden;
        }

        /* Video Background (simulated with black background for now) */
        .bg-video {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 0;
          opacity: 0.5; /* Dimmed slightly to let text pop */
        }

        /* Content Container to sit on top of video */
        .content {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
        }

        /* Top Right Logo */
        .logo {
          position: absolute;
          top: 30px;
          right: 40px;
          font-size: 28px;
          font-style: italic;
          font-weight: bold;
          text-align: right;
        }
        .logo span {
          display: block;
          font-size: 12px;
          font-weight: normal;
        }

        /* Bottom Right Button and Text */
        .action-container {
          position: absolute;
          bottom: 30px;
          right: 40px;
          text-align: right;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
        }

        .action-btn {
          background-color: #cc0000; /* Red arrow background */
          color: white;
          border: none;
          border-radius: 50%; /* Make it a circle */
          width: 60px;
          height: 60px;
          font-size: 24px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease;
        }

        .action-btn:hover {
          transform: scale(1.1);
        }

        .designer-text {
          font-size: 12px;
          font-style: italic;
          opacity: 0.8;
        }

        /* Left Side Text */
        .innovations-text {
          position: absolute;
          top: 40%;
          left: 10%;
          transform: translateY(-50%);
          display: flex;
          align-items: flex-end;
        }

        .innovations-text h1 {
          color: #cc0000;
          font-size: 100px;
          font-weight: 900;
          margin: 0;
          line-height: 0.8;
        }

        .innovations-text h2 {
          color: white;
          font-size: 32px;
          font-weight: normal;
          margin: 0;
          margin-bottom: 15px;
          margin-left: 15px;
          letter-spacing: 2px;
        }

        /* Responsive Breakpoints */
        @media (max-width: 768px) {
          .innovations-text h1 {
            font-size: 60px;
          }
          .innovations-text h2 {
            font-size: 20px;
            margin-bottom: 8px;
            margin-left: 10px;
          }
          .logo {
            top: 20px;
            right: 20px;
            font-size: 20px;
          }
          .action-container {
            bottom: 20px;
            right: 20px;
          }
        }
      </style>

      <!-- Optional: You can put a real <video> tag here if you have the video URL -->
      <!-- <video class="bg-video" autoplay loop muted src="YOUR_VIDEO_URL"></video> -->

      <div class="content">
        <div class="logo">
          Oza Motorsports
          <span>We Create Unicorns Among Horses</span>
        </div>

        <div class="innovations-text">
          <h1>OUR</h1>
          <h2>INNOVATIONS</h2>
        </div>

        <div class="action-container">
          <button class="action-btn">➔</button>
          <div class="designer-text">A design by Dhanya N Oza</div>
        </div>
      </div>
    `;
  }
}

// Register the custom element
customElements.define('showcase-frontend', ShowcaseElement);
