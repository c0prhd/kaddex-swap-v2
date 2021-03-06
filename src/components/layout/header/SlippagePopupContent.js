import React, { useContext, useState, useEffect } from "react";
import styled from "styled-components";
import { PactContext } from "../../../contexts/PactContext";
import theme from "../../../styles/theme";
import Input from "../../../shared/Input";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 9px;
  background: ${({ theme: colors }) => colors.purple} 0% 0% no-repeat
    padding-box;
`;

const BoldLabel = styled.span`
  font-size: 13px;
  font-family: ${({ theme: fontFamily }) => fontFamily.regular};
  text-transform: capitalize;
`;

const RegularLabel = styled.span`
  font-size: 13px;
  font-family: ${({ theme: fontFamily }) => fontFamily.regular};
  text-transform: capitalize;
  color: #ffffff;
`;

const SlippageTolleranceValue = styled.div`
  border-radius: 16px;
  border: 1px solid #ffffff;
  box-shadow: ${({ isSelected }) => (isSelected ? "0 0 5px #FFFFFF;" : "none")};
  color: #ffffff;
  text-shadow: ${({ isSelected }) =>
    isSelected ? "0 0 5px #FFFFFF;" : "none"};
  font-family: ${({ theme: fontFamily }) => fontFamily.regular};
  font-size: 14px;
  padding: 6.5px 8.5px;
  min-width: 48px;
  display: flex;
  justify-content: center;
  background-image: ${({ isSelected }) =>
    isSelected
      ? "linear-gradient(to top right, #ed098f 0%,  #7a0196 100%)"
      : "#ffffff"};
  cursor: pointer;
`;

const ContainerInputTypeNumber = styled.div`
  display: flex;
  align-items: center;
  padding: 6.5px 8.5px;
  border-radius: 16px;
  border: 1px solid #ffffff;
  color: #ffffff;
  .ui.input > input {
    border: unset;
    padding: 0px;
    text-align: right;
    font-size: 14px;
  }
  .ui.fluid.input > input {
    width: 80px !important;
  }
`;

const Row = styled.div`
  display: flex;
  align-items: center;
`;

const SlippagePopupContent = () => {
  const pact = useContext(PactContext);

  const [slp, setSlp] = useState(pact.slippage * 100);
  const [tl, setTl] = useState(pact.ttl * 60);
  useEffect(() => {
    if (slp) (async () => pact.storeSlippage(slp / 100))();
  }, [slp]);
  useEffect(() => {
    if (tl) (async () => pact.storeTtl(tl / 60))();
  }, [tl]);
  return (
    <Container>
      <BoldLabel style={{ color: "#FFFFFF" }}>Transactions Settings</BoldLabel>
      <RegularLabel style={{ marginTop: 16 }}>Slippage Tolerance</RegularLabel>

      <Row style={{ marginTop: 8 }}>
        <SlippageTolleranceValue
          isSelected={slp === 0.1}
          onClick={() => setSlp(0.1)}
        >
          0.1%
        </SlippageTolleranceValue>
        <SlippageTolleranceValue
          isSelected={slp === 0.5}
          style={{ marginLeft: 4, marginRight: 4 }}
          onClick={() => setSlp(0.5)}
        >
          0.5%
        </SlippageTolleranceValue>
        <SlippageTolleranceValue
          isSelected={slp === 1}
          style={{ marginRight: 8 }}
          onClick={() => setSlp(1)}
        >
          1%
        </SlippageTolleranceValue>

        <ContainerInputTypeNumber>
          <Input
            containerStyle={{
              border: "none !important",
              boxShadow: "none !important",
            }}
            placeholder={slp}
            numberOnly
            value={slp}
            onChange={(e, { value }) => {
              if (value >= 0 && value <= 100) {
                setSlp(value);
              }
            }}
          />
          %
        </ContainerInputTypeNumber>
      </Row>

      <RegularLabel style={{ marginTop: 16 }}>
        Transaction deadline
      </RegularLabel>
      <Row style={{ marginTop: 8 }}>
        <ContainerInputTypeNumber>
          <Input
            containerStyle={{
              border: "none !important",
              boxShadow: "none !important",
            }}
            placeholder={tl}
            numberOnly
            value={tl}
            onChange={(e, { value }) => {
              if (value >= 0) {
                setTl(value);
              }
            }}
          />
        </ContainerInputTypeNumber>
        <RegularLabel style={{ color: "#FFFFFF", marginLeft: 8 }}>
          minutes
        </RegularLabel>
      </Row>
    </Container>
  );
};

export default SlippagePopupContent;
