const listingId = document.getElementById("nearby-places").dataset.listingId;

async function loadNearbyPlaces() {

    const loading = document.getElementById("nearby-loading");
    const error = document.getElementById("nearby-error");
    const nearbyContainer = document.getElementById("nearby-places");

    try {

        const response = await fetch(
            `/listings/${listingId}/nearby`
        );

        if (!response.ok) {
            throw new Error("Failed to fetch nearby places");
        }

        const data = await response.json();

        console.log("NEARBY DATA:", data);

        const places = data.places || [];

        loading.classList.add("d-none");

        if (places.length === 0) {

            nearbyContainer.innerHTML = `
                <div class="col-12">
                    <p class="text-muted">
                        No nearby places found.
                    </p>
                </div>
            `;

            return;
        }

        nearbyContainer.innerHTML = places.map(place => `

            <div class="col-xl-4 col-lg-4 col-md-6 col-12">

                <div class="card h-100 nearby-card">

                    <div class="card-body">

                        <h5 class="card-title">
                            ${place.name}
                        </h5>

                        <p class="nearby-info">
                            <strong>Type:</strong>
                            ${place.type}
                        </p>

                        <p class="nearby-info">
                            <strong>Distance:</strong>
                            ${place.distance} km
                        </p>

                        <p class="nearby-info">
                            <strong>Best Time:</strong>
                            ${place.bestTime}
                        </p>

                        <a
                            href="${place.mapsUrl}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="btn btn-outline-dark nearby-map-btn"
                        >
                            View on Map
                        </a>

                    </div>

                </div>

            </div>

        `).join("");

    } catch (err) {

        console.error("Nearby Places Error:", err);

        loading.classList.add("d-none");
        error.classList.remove("d-none");
    }
}

loadNearbyPlaces();