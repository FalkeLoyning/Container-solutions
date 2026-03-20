export default function Dashboard({ running, stopped, images, networks }) {
  const cards = [
    { label: "Running Containers", value: running },
    { label: "Stopped", value: stopped },
    { label: "Images", value: images },
    { label: "Networks", value: networks },
  ];

  return (
    <section className="dashboard">
      {cards.map((card) => (
        <div className="card" key={card.label}>
          <h3>{card.label}</h3>
          <span className="metric">{card.value}</span>
        </div>
      ))}
    </section>
  );
}
