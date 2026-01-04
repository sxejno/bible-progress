# bible-progress: a KJV Word-Weighted Tracker

A modern, aesthetically pleasing, and mathematically accurate progress tracker for reading the King James Version (KJV) Bible. 

Unlike standard trackers that treat every chapter equally (where Psalm 117's 33 words count the same as Psalm 119's 2,423 words), this app tracks your progress based on **word count**. This gives you a true representation of how much of the Bible you have actually read.

## 🌟 Features

* **Word-Weighted Accuracy:** Progress bars represent the actual volume of text read, not just chapter counts.
* **Visual Dashboard:**
    * **Global Progress:** See your total completion percentage down to 4 decimal places.
    * **Category Breakdown:** Visual "Donut Charts" for specific subdivisions (e.g., The Pentateuch, Gospels, Wisdom Books, Epistles).
* **Daily Reading Plan:** An intelligent "Next Steps" tab that calculates the next 3 chapters you need to read and provides direct links to them.
* **Smart Search:** Instantly filter the library of 66 books to find exactly what you are looking for.
* **Data Management:** * **Auto-Save:** Your progress is saved automatically to your browser's local storage.
    * **Backup & Restore:** Export your progress to a JSON file to transfer between devices or keep as a backup.
* **Direct Study Links:** One-click access to read any chapter on the *Blue Letter Bible* website.

## 🚀 How to Use

### Option 1: Use it Online (Recommended)
Simply visit the hosted webpage here: 
> **[Insert Your GitHub Pages Link Here]**
*(e.g., https://yourusername.github.io/kjv-tracker/)*

### Option 2: Run Locally
1.  Download the `index.html` file from this repository.
2.  Double-click it to open it in any web browser (Chrome, Safari, Edge, Firefox).
3.  No internet connection is required for the core features (though internet is needed initially to load the styling libraries).

### Option 3: Install as an App
You can turn this into a mobile app using a tool like **Capacitor** or by using a "Web-to-App" converter.
* **Android:** Use Chrome -> "Add to Home Screen" to install it as a PWA (Progressive Web App).
* **iOS:** Use Safari -> Share Icon -> "Add to Home Screen".

## 🛠 Technologies Used

* **HTML5 & JavaScript (ES6):** The core logic and structure.
* **Tailwind CSS:** For the modern, glass-morphism aesthetic and responsive design.
* **Chart.js:** For the beautiful data visualization rings.
* **LocalStorage API:** For saving user data directly to the device without needing a login or database.

## 📊 Data Sources

* **Text:** King James Version (KJV).
* **Word Counts:** Verified word counts per chapter for maximum precision (Total: 789,634 words).

## 📄 License

This project is open-source. Feel free to fork it, modify it, or use it for your own study tools.
