const { Button } = antd;

function Counter() {
    const [count, setCount] = React.useState(0);

    const handleClick = () => {
        setCount(count + 1);
    };
    return (
        <div>
            <Button type="primary" onClick={handleClick}>
                Click me!
            </Button>
            <p>Button clicked {count} times</p>
        </div>
    );
}