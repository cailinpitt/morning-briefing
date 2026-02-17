const STATUS_LABELS = {
  0: "Delivered",
  1: "Frozen",
  2: "In Transit",
  3: "Awaiting Pickup",
  4: "Out for Delivery",
  5: "Not Found",
  6: "Failed Attempt",
  7: "Exception",
  8: "Info Received",
};

async function fetchCarrierNames() {
  const res = await fetch("https://api.parcel.app/external/supported_carriers.json");
  if (!res.ok) return {};
  return res.json();
}

async function fetchParcels() {
  const key = process.env.PARCEL_API_KEY;
  if (!key || key === "your_key_here") return null;

  const [deliveryRes, carrierNames] = await Promise.all([
    fetch("https://api.parcel.app/external/deliveries/?filter_mode=active", {
      headers: { "api-key": key },
    }),
    fetchCarrierNames().catch(() => ({})),
  ]);

  if (!deliveryRes.ok) {
    console.error(`Parcel API error: ${deliveryRes.status} ${deliveryRes.statusText}`);
    const body = await deliveryRes.text().catch(() => "");
    if (body) console.error(body);
    return null;
  }

  const data = await deliveryRes.json();
  if (!data.success) {
    console.error(`Parcel API error: ${data.error_message}`);
    return null;
  }

  return (data.deliveries || []).map((d) => ({
    description: d.description || d.tracking_number || "Unknown",
    status: STATUS_LABELS[d.status_code] || "Unknown",
    statusCode: d.status_code,
    expected: d.date_expected || null,
    expectedEnd: d.date_expected_end || null,
    latestEvent: d.events && d.events.length > 0 ? d.events[0].event : null,
    latestLocation: d.events && d.events.length > 0 ? d.events[0].location : null,
    latestEventDate: d.events && d.events.length > 0 ? new Date(d.events[0].date).toDateString() : null,
    carrier: carrierNames[d.carrier_code] || d.carrier_code,
  }));
}

function formatExpected(parcel) {
  if (!parcel.expected) return null;
  const start = new Date(parcel.expected);
  const opts = { month: "short", day: "numeric" };
  if (parcel.expectedEnd && parcel.expectedEnd !== parcel.expected) {
    const end = new Date(parcel.expectedEnd);
    return `${start.toLocaleDateString("en-US", opts)} - ${end.toLocaleDateString("en-US", opts)}`;
  }
  return start.toLocaleDateString("en-US", opts);
}

function printParcels(printer, parcels) {
  printer.printSectionTitle("PARCEL");

  if (!parcels) {
    printer.printLine("  Parcel data unavailable.");
    return;
  }

  if (parcels.length === 0) {
    printer.printLine("  No active shipments.");
    return;
  }

  for (const parcel of parcels) {
    printer.bold(true);
    printer.printWrapped(`  ${parcel.description} (${parcel.carrier})`, 40);
    printer.bold(false);

    let detail = `  ${parcel.status}`;
    const expected = formatExpected(parcel);
    if (expected) detail += ` - ETA ${expected}`;
    printer.printLine(detail);

    if (parcel.latestEvent) {
      let event = `  > ${parcel.latestEvent}`;
      if (parcel.latestLocation) event += ` (${parcel.latestLocation})`;
      if (parcel.latestEventDate) event += ` - ${parcel.latestEventDate}`;
      printer.printWrapped(event, 40);
    }
  }
}

module.exports = { fetchParcels, printParcels };
