document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper: simple initials from email/local-part
  function getInitialsFromEmail(email) {
    if (!email) return "?";
    const local = email.split("@")[0];
    const parts = local.split(/[._\-]/).filter(Boolean);
    const initials = parts.length
      ? parts.map(p => p[0]).slice(0,2).join("")
      : local.slice(0,2);
    return initials.toUpperCase();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - (details.participants?.length || 0);

        // Build main activity card content (we'll append participants programmatically so
        // we can attach delete handlers to each participant)
        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        // Build participants list DOM so we can add a delete button per participant
        const participants = Array.isArray(details.participants) ? details.participants : [];
        if (participants.length > 0) {
          const participantsDiv = document.createElement('div');
          participantsDiv.className = 'participants';

          const titleP = document.createElement('p');
          titleP.className = 'participants-title';
          titleP.innerHTML = '<strong>Participants:</strong>';
          participantsDiv.appendChild(titleP);

          const ul = document.createElement('ul');
          ul.className = 'participants-list';

          participants.forEach(p => {
            const li = document.createElement('li');
            li.className = 'participant-item';
            // store identifying info on the list item
            li.dataset.email = p;
            li.dataset.activity = name;

            const initials = getInitialsFromEmail(p);
            const badge = document.createElement('span');
            badge.className = 'participant-badge';
            badge.textContent = initials;

            const text = document.createElement('span');
            text.className = 'participant-text';
            text.textContent = p;

            // delete button
            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'participant-delete';
            del.title = 'Remove participant';
            del.setAttribute('aria-label', `Remove ${p}`);
            del.textContent = '✖';

            del.addEventListener('click', async (e) => {
              e.preventDefault();
              // call server to unregister
              try {
                const resp = await fetch(`/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(p)}`, {
                  method: 'DELETE'
                });

                if (resp.ok) {
                  // refresh activities to reflect change
                  await fetchActivities();
                } else {
                  const err = await resp.json().catch(() => ({}));
                  console.error('Failed to unregister participant', err);
                }
              } catch (err) {
                console.error('Error unregistering participant', err);
              }
            });

            li.appendChild(badge);
            li.appendChild(text);
            li.appendChild(del);
            ul.appendChild(li);
          });

          participantsDiv.appendChild(ul);
          activityCard.appendChild(participantsDiv);
        } else {
          const noP = document.createElement('p');
          noP.className = 'no-participants';
          noP.innerHTML = '<em>No participants yet — be the first to sign up!</em>';
          activityCard.appendChild(noP);
        }

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        // keep the base "message" class so styling applies
        messageDiv.className = "message success";
        signupForm.reset();
        // Refresh activities so the newly-signed-up participant appears immediately
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
