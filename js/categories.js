        const OT_CATS = [
            { name: "Pentateuch", count: 5, style: "bg-green-100 border-green-200 text-green-900", chartColor: "#16a34a" },
            { name: "History (OT)", count: 12, style: "bg-orange-100 border-orange-200 text-orange-900", chartColor: "#ea580c" },
            { name: "Wisdom", count: 5, style: "bg-indigo-100 border-indigo-200 text-indigo-900", chartColor: "#4f46e5" },
            { name: "Major Prophets", count: 5, style: "bg-red-100 border-red-200 text-red-900", chartColor: "#dc2626" },
            { name: "Minor Prophets", count: 12, style: "bg-cyan-100 border-cyan-200 text-cyan-900", chartColor: "#0891b2" }
        ];

        const NT_CATS = [
            { name: "Gospels", count: 4, style: "bg-emerald-100 border-emerald-200 text-emerald-900", chartColor: "#059669" },
            { name: "History (NT)", count: 1, style: "bg-amber-100 border-amber-200 text-amber-900", chartColor: "#d97706" },
            { name: "Pauline Epistles", count: 13, style: "bg-blue-100 border-blue-200 text-blue-900", chartColor: "#2563eb" },
            { name: "General Epistles", count: 8, style: "bg-teal-100 border-teal-200 text-teal-900", chartColor: "#0d9488" },
            { name: "Prophecy", count: 1, style: "bg-purple-100 border-purple-200 text-purple-900", chartColor: "#a855f7" }
        ];

        function assignCategories() {
            let i = 0;
            OT_CATS.forEach(cat => { for(let j=0; j<cat.count; j++) { if(bible[i]) { bible[i].cat = cat.name; bible[i].style = cat.style; bible[i].chartColor = cat.chartColor; i++; } } });
            NT_CATS.forEach(cat => { for(let j=0; j<cat.count; j++) { if(bible[i]) { bible[i].cat = cat.name; bible[i].style = cat.style; bible[i].chartColor = cat.chartColor; i++; } } });
        }

        function getCategoryLabelStyle(categoryName) {
            const allCats = [...OT_CATS, ...NT_CATS];
            const cat = allCats.find(c => c.name === categoryName);
            if (!cat) return "bg-indigo-100 text-indigo-700";
            // Extract just bg and text color from the style string
            const match = cat.style.match(/(bg-\w+-\d+).*(text-\w+-\d+)/);
            return match ? `${match[1]} ${match[2]}` : "bg-indigo-100 text-indigo-700";
        }

