import { useParams } from 'react-router-dom';

export default function OrderDetails() {
  const { id } = useParams();
  return <h1>Order Details #{id}</h1>;
}
