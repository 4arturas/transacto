const D3Chart = () => {
    // Create a ref to attach the D3 chart to a specific DOM element
    const chartRef = React.useRef(null);

    React.useEffect(() => {
        if (!chartRef.current) return;

        // Clear any existing chart to prevent duplicates on re-renders
        d3.select(chartRef.current).selectAll("*").remove();

        // Declare the chart dimensions and margins.
        const width = 640;
        const height = 400;
        const marginTop = 20;
        const marginRight = 20;
        const marginBottom = 30;
        const marginLeft = 40;

        // Declare the x (horizontal position) scale.
        const x = d3.scaleUtc()
            .domain([new Date("2023-01-01"), new Date("2024-01-01")])
            .range([marginLeft, width - marginRight]);

        // Declare the y (vertical position) scale.
        const y = d3.scaleLinear()
            .domain([0, 100])
            .range([height - marginBottom, marginTop]);

        // Create the SVG container.
        const svg = d3.create("svg")
            .attr("width", width)
            .attr("height", height);

        // Add the x-axis.
        svg.append("g")
            .attr("transform", `translate(0,${height - marginBottom})`)
            .call(d3.axisBottom(x));

        // Add the y-axis.
        svg.append("g")
            .attr("transform", `translate(${marginLeft},0)`)
            .call(d3.axisLeft(y));

        // Append the SVG element to the div referenced by chartRef
        chartRef.current.append(svg.node());

    }, []); // Empty dependency array means this effect runs once after initial render

    return (
        <div>
            <h2>D3.js Chart Example</h2>
            <div ref={chartRef}>
            </div>
        </div>
    );
};