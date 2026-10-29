import { InfoPage, InfoParagraph, InfoSection } from "@/components/info-page";
import { LinkRow } from "@/components/link-row";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { Image } from "@/components/ui/image";
import { router } from "expo-router";
import { StyleSheet, View } from 'react-native';

import type { Metadata } from 'expo-router/server';
import { SITE_URL } from "@/constants/site";

export function generateMetadata(): Metadata {
    const title = 'О проекте - Память новомучеников';
    const description = 'Узнайте о новомучениках и исповедниках Церкви Русской, биографические сведения и карте мест, связанных с их жизнью.';

    const url = `${SITE_URL}/about`;

    return {
        title,
        description,

        alternates: {
            canonical: url,
        },

        openGraph: {
            title,
            description,
            url,
            siteName: 'Память новомучеников',
            locale: 'ru_RU',
            type: 'website',
        },
    };
}


export default function AboutScreen() {
    const theme = useTheme();

    return (
        <InfoPage>
            <InfoSection title="Кто такие новомученники">
                <InfoParagraph>
                    Новомученики и исповедники Церкви Русской — это люди, пострадавшие за православие в XX веке, в годы гонений на Церковь после 1917 года. Мучениками называют убитых, исповедниками — тех, кто прошёл тюрьмы, лагеря и ссылки, но остался жив. Среди них епископы и приходские священники, монахи и монахини, псаломщики, старосты и просто прихожане: миряне составляют заметную часть этого собора.
                </InfoParagraph>
                <View style={styles.figure}>
                    <Image
                        style={[styles.image, { backgroundColor: theme.backgroundElement }]}
                        source={require('@/assets/images/about-1.jpg')}
                        contentFit="cover"
                        transition={200}
                        accessibilityLabel="Участники Юбилейного Архиерейского Собора у храма Христа Спасителя"
                    />
                    <ThemedText type="small" themeColor="textSecondary" style={styles.caption}>
                        Участники Юбилейного Архиерейского Собора у храма Христа Спасителя, 2000 год
                    </ThemedText>
                </View>
                <InfoParagraph>
                    Поимённое прославление состоялось на Юбилейном Архиерейском Соборе Русской Православной Церкви в 2000 году, и с тех пор список пополнялся. Общая память празднуется в воскресенье, ближайшее к 25 января по старому стилю (7 февраля по новому), — в этот день в 1918 году был убит митрополит Киевский Владимир (Богоявленский), первый архиерей, пострадавший в те годы. У каждого при этом есть и свой день памяти, как правило, день кончины. Именно по нему в этом приложении устроены вкладки «Сегодня» и «Календарь».
                </InfoParagraph>
            </InfoSection>
            <InfoSection title="Откуда здесь сведения">
                <InfoParagraph>
                    Вся информация приходит из базы данных «За Христа пострадавшие», которая была разработана Православным Свято-Тихоновским гуманитарным университетом. Это многолетняя работа со следственными делами, архивами и свидетельствами. Приложение отображает то, что есть в базе, и обновляется вместе с ней.
                </InfoParagraph>
                <LinkRow href="https://pstgu.ru/baza-dannykh-za-khrista-postradavshie" label="База данных «За Христа пострадавшие»" />
            </InfoSection>
            <InfoSection title="Что показывает карта">
                <InfoParagraph>
                    Точки на карте — места из биографий: где человек родился, где служил, где был арестован, где окончил жизнь. Координаты к историческим событиям расставлены вручную специалистом по исторической географии, а затем сопоставлены с биографиями. Работа не закончена: разобрана часть источников, и в данных заметен перевес в сторону небольших сёл и деревень — крупные и всем известные города, во многих случаях, ещё не размечены.
                </InfoParagraph>
                <InfoParagraph>
                    Поэтому густота точек говорит о том, какая часть материала уже обработана, а не о том, где гонения были сильнее. Пустое место на карте почти никогда не значит, что там ничего не происходило.
                </InfoParagraph>
                <LinkRow href="https://map.nmbook.ru" label="Карта проекта" />
            </InfoSection>
            <InfoSection title="Про это приложение">
                <InfoParagraph>
                    Приложение разработано, чтобы память о новомучениках была под рукой каждый день: открыть и увидеть, чья память сегодня. Оно работает на iOS, на Android и в браузере. Приложение отображает данные из базы «За Христа пострадавшие».
                </InfoParagraph>
                <InfoParagraph>
                    Подложка карты: OpenStreetMap (стили OpenFreeMap и CARTO). Фотографии и тексты принадлежат правообладателям.
                </InfoParagraph>
                <LinkRow href="https://api.nmbook.ru/docs" label="API проекта" />
            </InfoSection>
            <InfoSection title="Кто участвовал в разработке">
                <InfoParagraph>
                    Сведения о новомучениках собраны сотрудниками добровольцами Православного Свято-Тихоновского гуманитарного университета. Карта и разбор исторической географии их же отдельная работа.
                </InfoParagraph>
                <InfoParagraph>
                    Приложение является самостоятельной разработкой студентов 4 курса ФИПМ ПСТГУ в составе: Дыбка Даниил, Семченко Александр, Чехова Анастасия, Герасимов Игнатий и Ромашин Михаил. Разработка велась при консультационной поддержке Евсеева Андрея Сергеевича, старшего преподавателя ФИПМ ПСТГУ.
                </InfoParagraph>
                <LinkRow label="Помочь проекту" onPress={() => router.push('/help')} />
            </InfoSection>
            <InfoSection title="Другие разработки">
                <InfoParagraph>
                    В рамках поддержки базы данных «За Христа пострадавшие» также были разработаны веб-виджет и мини-приложение ВКонтакте, позволяющие ежедневно отображать сведения о поминаемых новомучениках и исповедниках Русской Церкви.
                </InfoParagraph>
                <LinkRow href="https://widget-demo.dybka.ru" label="Подробнее о других разработках" />
            </InfoSection>
        </InfoPage>
    )
}

const styles = StyleSheet.create({
    figure: {
        marginBottom: Spacing.four,
        gap: Spacing.three,
    },
    // Фотография во всю ширину, от края до края — отступ только у текста.
    image: {
        width: '100%',
        aspectRatio: 800 / 562,
        marginTop: Spacing.four,
    },
    caption: {
        textAlign: 'center',
        paddingHorizontal: Spacing.three,
    },
});
