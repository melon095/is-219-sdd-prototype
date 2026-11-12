import { features } from "../../app/features";
import { ActivityFeed } from "../activity/ActivityFeed";
import { useDemoState } from "../store/store";
import { Card } from "../ui/Card";
import { Link } from "../ui/Link";
import { PageHeading } from "../ui/PageHeading";
import { useCurrentPerson } from "../users/useCurrentPerson";
import "./HomePage.css";

export function HomePage() {
  const state = useDemoState();
  const person = useCurrentPerson();
  const firstName = person.name.split(" ")[0] ?? person.name;

  const cards = features
    .map((feature) => ({
      id: feature.id,
      card: feature.homeCard(person, state),
    }))
    .flatMap(({ id, card }) => (card === null ? [] : [{ id, card }]));

  return (
    <>
      <PageHeading>{`Hei, ${firstName}!`}</PageHeading>
      <div className="home-columns">
        <div className="home-cards">
          {cards.map(({ id, card }) => (
            <Card
              key={id}
              heading={card.title}
              action={<Link href={card.route}>{card.actionLabel}</Link>}
            >
              <p>{card.text}</p>
            </Card>
          ))}
        </div>
        <ActivityFeed />
      </div>
    </>
  );
}
