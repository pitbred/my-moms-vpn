import { StyleSheet } from 'react-native';

export const SPACING = {
    z: 0,
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
};

export const commonStyles = StyleSheet.create({
    // Контейнеры
    flex1: {
        flex: 1
    },
    flex2: {
        flex: 2
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center'
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    rowBetween: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    jsb: {
        justifyContent: 'space-between'
    },
    jc: {
        justifyContent: 'center'
    },
    alflexend: {
        alignItems: "flex-end"
    },
    // Отступы (Paddings)
    p0: {
        padding: SPACING.z
    },
    p8: {
        padding: SPACING.s
    },
    p16: {
        padding: SPACING.m,
    },
    pl16: {
        paddingLeft: SPACING.m
    },
    ph0: {
        paddingHorizontal: SPACING.z
    },
    ph12: {
        paddingHorizontal: 12
    },
    ph16: {
        paddingHorizontal: SPACING.m
    },
    pt8: {
        paddingTop: SPACING.s
    },
    pt16: {
        paddingTop: SPACING.m
    },
    pt32: {
        paddingTop: SPACING.xl
    },
    pb8: {
        paddingBottom: SPACING.s
    },
    pb16: {
        paddingBottom: SPACING.m
    },
    pv0: {
        paddingVertical: SPACING.z
    },
    pv4: {
        paddingVertical: SPACING.xs
    },
    pv8: {
        paddingVertical: SPACING.s
    },
    mh0: {
        marginHorizontal: SPACING.z
    },
    mh12: {
        marginHorizontal: 12
    },
    mv0: {
        marginVertical: SPACING.z
    },
    m0: {
        margin: SPACING.z
    },
    m16: {
        margin: SPACING.m
    },
    ml8: {
        marginLeft: SPACING.s
    },
    mt16: {
        marginTop: SPACING.m
    },
    mb8: {
        marginBottom: SPACING.s
    },
    mb16: {
        marginBottom: SPACING.m
    },
    mb24: {
        marginBottom: SPACING.l
    },
    gap4: {
        gap: SPACING.xs
    },
    gap8: {
        gap: SPACING.s
    },
    gap12: {
        gap: 12
    },
    gap16: {
        gap: SPACING.m
    },
    // Текст
    mono: {
        fontFamily: 'monospace',
        fontSize: 13
    },
    mono12: {
        fontFamily: 'monospace',
        fontSize: 12
    },
    mono14: {
        fontFamily: 'monospace',
        fontSize: 14
    },
    snak: {
        position: "absolute",
        bottom: 0
    },
    appIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
        marginRight: 12
    },
    borderw0: {
        borderWidth: SPACING.z
    },
    borderR8: {
        borderRadius: 8
    },
    statusText: {
        textAlign: 'center',
        marginBottom: 32
    },
    powerButton: {
        alignSelf: 'center',
        borderRadius: 100,
        marginBottom: 40
    },
    powerButtonContent: {
        width: 200,
        height: 200
    },
    fabs: {
        position: 'absolute',
        right: 20,
        padding: 10,
        borderRadius: 20
    },
    fabLeft: {
        position: 'absolute',
        margin: 16,
        left: 0,
        bottom: 0
    },
    fabNewVPN: {
        right: 16,
        bottom: 16,
        alignSelf: 'flex-end',
    },
    bottom70: {
        bottom: 70
    },
    bottom20: {
        bottom: 20
    },
    opacity6: {
        opacity: 0.6
    },
    modal: {
        padding: 20,
        margin: 20,
        borderRadius: 16
    },
    comfirmButton: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 8
    },
    fileName: {
        position: 'absolute',
        top: 10,
        right: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        opacity: 0.8,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
        position: 'absolute',
        left: 0,
        right: 0,        
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: 16,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginVertical: 8,
    },
});